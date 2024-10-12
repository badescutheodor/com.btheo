import Link from "next/link";

export default function LearnSection() {
  const lessons = [
    "Introduction to React 2025",
    "Firestore, Chakra UI, Absolute Imports",
    "Designing & Building the Dashboard",
    "Firebase Admin with Next.js + SWR",
  ];

  return (
    <section className="learn-section">
      <h2>Learn React & Next.js</h2>
      <ul>
        {lessons.map((lesson, index) => (
          <li key={index}>{lesson}</li>
        ))}
      </ul>
      <Link href="/courses">View all posts →</Link>
    </section>
  );
}
