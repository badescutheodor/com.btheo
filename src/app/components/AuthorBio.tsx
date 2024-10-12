import Image from "next/image";

interface AuthorBioProps {
  name: string;
  bio: string;
  avatarUrl: string;
}

const AuthorBio: React.FC<AuthorBioProps> = ({ name, bio, avatarUrl }) => {
  return (
    <div className="author-bio">
      <Image
        src={avatarUrl}
        alt={name}
        width={60}
        height={60}
        className="author-avatar"
      />
      <div className="author-info">
        <h3>{name}</h3>
        <p>{bio}</p>
      </div>
    </div>
  );
};

export default AuthorBio;
