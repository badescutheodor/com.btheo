import { Suspense } from "react";
import {
  getSnippets,
  getLanguages,
  getLabels,
  getTotalSnippetsCount,
} from "@/lib/snippets";
import SnippetsClient from "@/app/components/SnippetsClient";

export const dynamic = "force-dynamic";
export const revalidate = 86400; // 1 day in seconds

async function SnippetsPage({
  searchParams,
}: {
  searchParams: { page?: string; language?: string; label?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const language = searchParams.language;
  const label = searchParams.label;

  const snippetsData = getSnippets({ page, language, label });
  const languagesData = getLanguages();
  const labelsData = getLabels();
  const totalCountData = getTotalSnippetsCount(language, label);

  const [snippets, languages, labels, totalCount] = await Promise.all([
    snippetsData,
    languagesData,
    labelsData,
    totalCountData,
  ]);

  const totalPages = Math.ceil(totalCount / 10); // Assuming 10 snippets per page

  return (
    <div>
      <h1>Code Snippets</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <SnippetsClient
          initialSnippets={snippets}
          languages={languages}
          labels={labels}
          initialPage={page}
          initialLanguage={language}
          initialLabel={label}
          totalPages={totalPages}
        />
      </Suspense>
    </div>
  );
}

export default SnippetsPage;
