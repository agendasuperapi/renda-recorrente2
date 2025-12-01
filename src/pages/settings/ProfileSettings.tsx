import { ProfileContent } from "@/components/settings/ProfileContent";

const ProfileSettings = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie as informações do seu perfil
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ProfileContent />
      </div>
    </div>
  );
};

export default ProfileSettings;
