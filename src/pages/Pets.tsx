
const Pets = () => {
  return (
    <div className="relative w-full">
      <div className="absolute top-4 right-4">
        <AuthDialog />
      </div>
      
      <div className="container max-w-[70%] mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">My Pets</h1>
        <PetTravelWallet />
      </div>
    </div>
  );
};

export default Pets;
