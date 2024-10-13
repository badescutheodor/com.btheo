import { AppDataSource } from "../lib/db";
import { User } from "../lib/entities/User";
import { Setting } from "../lib/entities/Setting";
import { hash } from "bcryptjs";

async function initDb() {
  await AppDataSource.initialize();
  
  const userRepository = AppDataSource.getRepository(User);
  const settingRepository = AppDataSource.getRepository(Setting);

  // Create admin user if not exists
  const adminUser = await userRepository.findOne({ where: { email: "theo@btheo.com" } });

  if (!adminUser) {
    const hashedPassword = await hash("dedede123A", 10);
    const newAdmin = userRepository.create({
      name: "Theodor Badescu",
      email: "theo@btheo.com",
      password: hashedPassword,
      role: "admin",
      bio: "",
    });

    await userRepository.save(newAdmin);
    console.log("Admin user created successfully");
  } else {
    console.log("Admin user already exists");
  }

  // Create initial settings if not exist
  const initialSettings = [
    { key: "homeTitle", value: "Theodor Badescu" },
    { key: "homeDescription", value: '🚀 Building Digital Solutions that Take Your Ideas to New Heights – Crafting Innovative, Custom Websites and Apps to Elevate Your Vision and Achieve Your Success' },
    { key: "homeImage", value: "/images/default-landing.jpg" },
    { key: "name", value: "Theodor Badescu" },
    { key: "githubLink", value: "https://github.com/bthe0" },
    { key: "linkedinLink", value: "https://www.linkedin.com/in/bthe0/" },
    { key: "twitterLink", value: "https://x.com/bthe0_" },
    { key: "resumeLink", value: "/Theodor_Badescu_Resume.pdf" },
  ];

  for (const setting of initialSettings) {
    const existingSetting = await settingRepository.findOne({ where: { key: setting.key } });

    if (!existingSetting) {
      const newSetting = settingRepository.create(setting);
      await settingRepository.save(newSetting);
      console.log(`Setting '${setting.key}' created successfully`);
    } else {
      console.log(`Setting '${setting.key}' already exists`);
    }
  }

  await AppDataSource.destroy();
}

initDb().catch(console.error);