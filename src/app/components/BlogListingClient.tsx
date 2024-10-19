"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Input from "./Input";
import { FiSearch } from "react-icons/fi";
import { debounce } from "@/lib/utils-client";
import Pagination from "./Pagination";

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
  initialPosts: {
    data: BlogPost[];
    meta: Record<string, any>;
  };
  labels: Record<string, string>[];
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
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState(initialPosts.data);
  const [meta, setMeta] = useState(initialPosts.meta);
  const [page, setPage] = useState(initialPage);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const newPage = Number(searchParams.get("page")) || 1;
    const newLabel = searchParams.get("label") || undefined;
    const newSearch = searchParams.get("search") || undefined;

    if (newPage !== page || newLabel !== selectedLabel) {
      fetchPosts(newPage, newLabel, newSearch);
    }
  }, [searchParams]);

  const fetchPosts = useCallback(
    async (newPage: number, label?: any, newSearch?: string) => {
      const params = new URLSearchParams();
      if (newPage > 1) {
        params.set("page", newPage.toString());
      }

      if (newSearch) {
        params.set("search", newSearch || "");
      }

      if (label) params.set("label", label);

      const res = await fetch(`/api/posts?${params.toString()}`);
      const posts = await res.json();
      setPosts(posts.data);
      setPage(newPage);
      setSelectedLabel(label.slug);

      router.push(`/blog?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  const handleLabelChange = (label: string) => {
    fetchPosts(1, label);
  };

  const onPageChange = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (selectedLabel) params.set("label", selectedLabel);
    router.push(`/blog?${params.toString()}`, { scroll: false });
    setPage(pageNum);
    fetchPosts(pageNum, selectedLabel, search);
  };

  const debouncedSearch = useMemo(
    () =>
      debounce((search: string) => {
        fetchPosts(1, "", search);
      }, 300),
    [fetchPosts]
  );

  const onSearchChange = (value: string) => {
    setSearch(value);
    debouncedSearch(value);
  };

  return (
    <div>
      <div className="row">
        <div className="col-lg-5 col-sm-12">
          <Input
            iconLeft={<FiSearch />}
            name="search"
            type="text"
            value={search}
            placeholder="Search for blog posts..."
            withClear
            onChange={onSearchChange}
          />
        </div>
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
        <Pagination
          itemsPerPage={meta.perPage}
          page={meta.currentPage}
          onPageChange={onPageChange}
          totalPages={meta.totalPages}
        />
      </div>
    </div>
  );
}
