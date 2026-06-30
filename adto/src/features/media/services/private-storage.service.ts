import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_BUCKET = "adto-private";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;
const STORAGE_REF_PROTOCOL = "supabase-storage:";

let ensuredBucket: Promise<void> | null = null;

export type PrivateStorageUpload = {
  path: string;
  body: Buffer | ArrayBuffer | Blob | File;
  contentType: string;
  cacheControl?: string;
  upsert?: boolean;
};

export function getPrivateStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;
}

function getSignedUrlTtlSeconds() {
  const configured = Number(process.env.SUPABASE_SIGNED_URL_TTL_SECONDS);
  return Number.isFinite(configured) && configured >= 60 ? Math.floor(configured) : DEFAULT_SIGNED_URL_TTL_SECONDS;
}

function storageRef(bucket: string, path: string) {
  return `${STORAGE_REF_PROTOCOL}//${bucket}/${path}`;
}

export function parseStorageRef(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== STORAGE_REF_PROTOCOL || !parsed.hostname) return null;
    return {
      bucket: parsed.hostname,
      path: parsed.pathname.replace(/^\/+/, ""),
    };
  } catch {
    return null;
  }
}

export function sanitizeStorageSegment(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 120) || "file"
  );
}

async function ensurePrivateBucket() {
  if (!ensuredBucket) {
    ensuredBucket = (async () => {
      const bucket = getPrivateStorageBucket();
      const supabase = createAdminClient();
      const { data, error } = await supabase.storage.getBucket(bucket);
      if (data) return;
      if (error && !/not found|does not exist/i.test(error.message)) {
        throw new Error(`Could not check Supabase Storage bucket "${bucket}": ${error.message}`);
      }

      const { error: createError } = await supabase.storage.createBucket(bucket, { public: false });
      if (createError && !/already exists/i.test(createError.message)) {
        throw new Error(`Could not create Supabase Storage bucket "${bucket}": ${createError.message}`);
      }
    })();
  }

  return ensuredBucket;
}

export async function uploadPrivateObject({ path, body, contentType, cacheControl = "3600", upsert = false }: PrivateStorageUpload) {
  await ensurePrivateBucket();
  const bucket = getPrivateStorageBucket();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(bucket).upload(path, body, {
    cacheControl,
    contentType,
    upsert,
  });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  return {
    bucket,
    path: data.path,
    ref: storageRef(bucket, data.path),
  };
}

export async function resolveStorageUrl(value: string) {
  const parsed = parseStorageRef(value);
  if (!parsed) return value;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, getSignedUrlTtlSeconds());
  if (error) {
    throw new Error(`Could not create signed URL for private storage object: ${error.message}`);
  }

  return data.signedUrl;
}
