
interface EmptyPolicyProps {
  title: string;
  message: string;
}

export const EmptyPolicy = ({ title, message }: EmptyPolicyProps) => {
  return (
    <div className="bg-white p-6 rounded-lg">
      <h2 className="text-xl font-semibold tracking-normal mb-4">{title}</h2>
      <p className="text-gray-500 italic">{message}</p>
    </div>
  );
};
