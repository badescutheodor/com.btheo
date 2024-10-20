import { Metadata } from "next";
import FeaturedPosts from "@/app/components/FeaturedPosts";
import { getSettings } from "@/lib/utils-server";
import ResumeButton from "@/app/components/ResumeButton";

export const metadata: Metadata = {
  title: "Next.js",
};

export default async function Home() {
  const settings = await getSettings();

  return (
    <div className="home">
      <div className="profile">
        <h1>{settings.homeTitle}</h1>
        <p className="col-lg-8 col-md-12">{settings.homeDescription}</p>
        {settings.resumeLink && <ResumeButton href={settings.resumeLink} />}
        <FeaturedPosts />
      </div>
    </div>
  );
}
