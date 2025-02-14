
export class BatchProcessor {
  private REQUEST_TIMEOUT: number;
  private MAX_RETRIES: number;
  private BATCH_SIZE: number;
  private DELAY_BETWEEN_BATCHES: number;

  constructor(
    timeout = 30000,
    maxRetries = 3,
    batchSize = 3, // Reduced from 5 to 3 to prevent timeouts
    delayBetweenBatches = 2000
  ) {
    this.REQUEST_TIMEOUT = timeout;
    this.MAX_RETRIES = maxRetries;
    this.BATCH_SIZE = batchSize;
    this.DELAY_BETWEEN_BATCHES = delayBetweenBatches;
  }

  async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async retryOperation<T>(
    operation: () => Promise<T>,
    retryCount = 0,
    customTimeout?: number
  ): Promise<T> {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), 
          customTimeout || this.REQUEST_TIMEOUT);
      });

      const operationPromise = operation();
      return await Promise.race([operationPromise, timeoutPromise]) as T;
    } catch (error) {
      console.error(`Operation failed (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < this.MAX_RETRIES) {
        const delayTime = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying in ${delayTime}ms...`);
        await this.delay(delayTime);
        return this.retryOperation(operation, retryCount + 1);
      }
      
      throw error;
    }
  }

  getBatchSize() {
    return this.BATCH_SIZE;
  }

  getDelayBetweenBatches() {
    return this.DELAY_BETWEEN_BATCHES;
  }

  getTimeout() {
    return this.REQUEST_TIMEOUT;
  }
}
