import fs from "fs/promises";
import path from "path";
import { resolveRuntimeDataPath } from "../storage/runtime-store-root";
import { writeAtomic } from "../storage/atomic-write";
import type { ResearchVoiceProfile, PublicResearchPost } from "@/domain/research/research-voice";

function getProfilesDir(): string {
  return resolveRuntimeDataPath("data", "research", "voice-profiles");
}

function getPostsDir(): string {
  return resolveRuntimeDataPath("data", "research", "posts");
}

function getProfilePath(voiceId: string): string {
  return path.join(getProfilesDir(), `${voiceId}.json`);
}

function getPostPath(postId: string): string {
  return path.join(getPostsDir(), `${postId}.json`);
}

function getPostsIndexPath(): string {
  return path.join(getPostsDir(), "index.json");
}

export async function saveVoiceProfile(profile: ResearchVoiceProfile): Promise<void> {
  const dir = getProfilesDir();
  await fs.mkdir(dir, { recursive: true });
  const filePath = getProfilePath(profile.voiceId);
  await writeAtomic(filePath, JSON.stringify(profile, null, 2));
}

export async function getVoiceProfile(voiceId: string): Promise<ResearchVoiceProfile | null> {
  const filePath = getProfilePath(voiceId);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as ResearchVoiceProfile;
  } catch {
    return null;
  }
}

export async function listVoiceProfiles(): Promise<ResearchVoiceProfile[]> {
  const dir = getProfilesDir();
  try {
    const files = await fs.readdir(dir);
    const profiles: ResearchVoiceProfile[] = [];
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const data = await fs.readFile(path.join(dir, file), "utf-8");
          profiles.push(JSON.parse(data) as ResearchVoiceProfile);
        } catch {
          // ignore
        }
      }
    }
    return profiles;
  } catch {
    return [];
  }
}

export async function saveResearchPost(post: PublicResearchPost): Promise<void> {
  const dir = getPostsDir();
  await fs.mkdir(dir, { recursive: true });

  const filePath = getPostPath(post.postId);

  // Append-only rule: do not overwrite prior post files if content is different
  try {
    const existingData = await fs.readFile(filePath, "utf-8");
    const existingPost = JSON.parse(existingData) as PublicResearchPost;
    if (existingPost.contentHash !== post.contentHash) {
      throw new Error(`Immutable post violation: post "${post.postId}" already exists with a different content hash.`);
    }
    // Idempotent: same content hash is fine
    return;
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  // Write the post file
  await writeAtomic(filePath, JSON.stringify(post, null, 2));

  // Try to update index for performance
  try {
    await updatePostsIndex(post);
  } catch (err) {
    console.error("Warning: Failed to update derived posts index, records remain authoritative:", err);
  }
}

export async function getResearchPost(postId: string): Promise<PublicResearchPost | null> {
  const filePath = getPostPath(postId);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as PublicResearchPost;
  } catch {
    return null;
  }
}

export async function listResearchPosts(query?: {
  voiceId?: string;
  status?: PublicResearchPost["status"];
}): Promise<PublicResearchPost[]> {
  // Try index first for performance
  try {
    const indexPath = getPostsIndexPath();
    const indexData = await fs.readFile(indexPath, "utf-8");
    const posts = JSON.parse(indexData) as PublicResearchPost[];
    return filterPosts(posts, query);
  } catch {
    // Fall back to scanning files
    const dir = getPostsDir();
    try {
      const files = await fs.readdir(dir);
      const posts: PublicResearchPost[] = [];
      for (const file of files) {
        if (file.endsWith(".json") && file !== "index.json") {
          try {
            const data = await fs.readFile(path.join(dir, file), "utf-8");
            posts.push(JSON.parse(data) as PublicResearchPost);
          } catch {
            // ignore
          }
        }
      }
      return filterPosts(posts, query);
    } catch {
      return [];
    }
  }
}

function filterPosts(posts: PublicResearchPost[], query?: { voiceId?: string; status?: PublicResearchPost["status"] }): PublicResearchPost[] {
  let result = posts;
  if (query?.voiceId) {
    result = result.filter((p) => p.voiceId === query.voiceId);
  }
  if (query?.status) {
    result = result.filter((p) => p.status === query.status);
  }
  return result;
}

async function updatePostsIndex(newPost: PublicResearchPost): Promise<void> {
  const indexPath = getPostsIndexPath();
  let posts: PublicResearchPost[] = [];
  try {
    const data = await fs.readFile(indexPath, "utf-8");
    posts = JSON.parse(data) as PublicResearchPost[];
  } catch {
    // index doesn't exist or is corrupt
  }

  const existingIdx = posts.findIndex((p) => p.postId === newPost.postId);
  if (existingIdx >= 0) {
    posts[existingIdx] = newPost;
  } else {
    posts.push(newPost);
  }

  await writeAtomic(indexPath, JSON.stringify(posts, null, 2));
}

export async function clearAllResearchVoicesAndPosts(): Promise<void> {
  try {
    await fs.rm(getProfilesDir(), { recursive: true, force: true });
    await fs.rm(getPostsDir(), { recursive: true, force: true });
  } catch {
    // ignore
  }
}
