import { Metadata } from "next";
import FeaturedPosts from "@/app/components/FeaturedPosts";
import { getSettings } from "@/lib/utils";
import Button from "@/app/components/Button";
import { FiFileText } from "react-icons/fi";

export const metadata: Metadata = {
  title: "Next.js",
};

export default async function Home() {
  const settings = await getSettings();

  return (
    <div className="home">
      <div className="profile">
        <h1>{settings.homeTitle}</h1>
        <p>{settings.homeDescription}</p>
        {settings.resumeLink && (
          <Button
            size={"large"}
            icon={FiFileText}
            target={"_blank"}
            className={"full-width-sm border-radius-10-md"}
            href={settings.resumeLink}
            maskAnimated={2}
          >
            My Resume
          </Button>
        )}
        <FeaturedPosts />
      </div>
    </div>
  );
}
