"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Snippet {
  id: number;
  title: string;
  code: string;
  language: string;
  labels: string[];
}

interface SnippetsClientProps {
  initialSnippets: Snippet[];
  languages: string[];
  labels: string[];
  initialPage: number;
  initialLanguage?: string;
  initialLabel?: string;
  totalPages: number;
}

export default function SnippetsClient({
  initialSnippets,
  languages,
  labels,
  initialPage,
  initialLanguage,
  initialLabel,
  totalPages,
}: SnippetsClientProps) {
  const [snippets, setSnippets] = useState(initialSnippets);
  const [page, setPage] = useState(initialPage);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const newPage = Number(searchParams.get("page")) || 1;
    const newLanguage = searchParams.get("language") || undefined;
    const newLabel = searchParams.get("label") || undefined;

    if (
      newPage !== page ||
      newLanguage !== selectedLanguage ||
      newLabel !== selectedLabel
    ) {
      fetchSnippets(newPage, newLanguage, newLabel);
    }
  }, [searchParams]);

  const fetchSnippets = async (
    newPage: number,
    language?: string,
    label?: string
  ) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    if (language) params.set("language", language);
    if (label) params.set("label", label);

    const res = await fetch(`/api/snippets?${params.toString()}`);
    const data = await res.json();
    setSnippets(data);
    setPage(newPage);
    setSelectedLanguage(language);
    setSelectedLabel(label);

    router.push(`/snippets?${params.toString()}`, { scroll: false });
  };

  const handleLanguageChange = (language: string) => {
    fetchSnippets(1, language, selectedLabel);
  };

  const handleLabelChange = (label: string) => {
    fetchSnippets(1, selectedLanguage, label);
  };

  const getPageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (selectedLanguage) params.set("language", selectedLanguage);
    if (selectedLabel) params.set("label", selectedLabel);
    return `/snippets?${params.toString()}`;
  };

  return (
    <div>
      <div>
        <select
          value={selectedLanguage || ""}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          <option value="">All Languages</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <select
          value={selectedLabel || ""}
          onChange={(e) => handleLabelChange(e.target.value)}
        >
          <option value="">All Labels</option>
          {labels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {snippets.map((snippet) => (
        <div key={snippet.id}>
          <h3>{snippet.title}</h3>
          <pre>
            <code>{snippet.code}</code>
          </pre>
          <div>
            <span>Language:</span> {snippet.language}
          </div>
          <div>
            <span>Labels:</span> {snippet.labels.join(", ")}
          </div>
        </div>
      ))}
      <div>
        {page > 1 && <Link href={getPageUrl(page - 1)}>Previous</Link>}
        {[...Array(totalPages)].map((_, i) => (
          <Link key={i} href={getPageUrl(i + 1)}>
            {i + 1}
          </Link>
        ))}
        {page < totalPages && <Link href={getPageUrl(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}
