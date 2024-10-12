"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface BlogPost {
  id: number;
  title: string;
  labels: Record<string, any>[];
  isFeatured: boolean;
  views: number;
  author: Record<string, any>;
  date: string;
  slug: string;
  excerpt: string;
}

interface BlogListingClientProps {
  initialPosts: BlogPost[];
  labels: Record<string, any>[];
  initialPage: number;
  initialLabel?: string;
  totalPages: number;
}

export default function BlogListingClient({
  initialPosts,
  labels,
  initialPage,
  initialLabel,
  totalPages,
}: BlogListingClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(initialPage);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const newPage = Number(searchParams.get("page")) || 1;
    const newLabel = searchParams.get("label") || undefined;

    if (newPage !== page || newLabel !== selectedLabel) {
      fetchPosts(newPage, newLabel);
    }
  }, [searchParams]);

  const fetchPosts = async (newPage: number, label?: any) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    if (label) params.set("label", label);

    const res = await fetch(`/api/posts?${params.toString()}`);
    const data = await res.json();
    setPosts(data);
    setPage(newPage);
    setSelectedLabel(label.slug);

    router.push(`/blog?${params.toString()}`, { scroll: false });
  };

  const handleLabelChange = (label: string) => {
    fetchPosts(1, label);
  };

  const getPageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (selectedLabel) params.set("label", selectedLabel);
    return `/blog?${params.toString()}`;
  };

  return (
    <div>
      <div>
        <select
          value={selectedLabel || ""}
          onChange={(e) => handleLabelChange(e.target.value)}
        >
          <option value="">All Labels</option>
          {labels.map((label) => (
            <option key={label.id} value={label.slug}>
              {label.name}
            </option>
          ))}
        </select>
      </div>
      {posts.map((post) => (
        <div key={post.id}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
          <p>{post.excerpt}</p>
          <p>{post.date}</p>
          <p>{post.author.name}</p>
          <p>Labels: {post.labels.map((label) => label.name).join(",")}</p>
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
