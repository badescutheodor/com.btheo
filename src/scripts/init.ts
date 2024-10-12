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
    { key: "title", value: "My Awesome Website" },
    { key: "landingImage", value: "/images/default-landing.jpg" }
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