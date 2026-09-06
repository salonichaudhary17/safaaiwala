import {
  cachePrice,
  getCachedPrice,
  queueAction,
} from "./offlineStore";

export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

export interface Material {
  id: string;
  code: string;
  label_en: string;
  label_hi: string;
  label_mr: string;
  category: string;
  subCategory: string;
  hazardous: boolean;
  safety_note_en: string;
  safety_note_hi: string;
  safety_note_mr: string;
}

export interface PriceResponse {
  material: string;
  location: string;
  latest: number;
  buyingPricePerKg: number;
  marketRangeMin?: number;
  marketRangeMax?: number;
  effectiveFrom?: string;
  source?: string;
}

export interface CreateLotPayload {
  clientLotId: string;
  collectorId: string;
  materialHint: string;
  hasPhoto: boolean;
  imageDataUrl?: string | null;
  weightKg: number;
  location: string;
  lat: number;
  lng: number;
  address?: string;
  description?: string;
  offlineCreated?: boolean;
}

export interface LotResponse {
  lot: {
    id?: string;
    lotId: string;
    clientLotId: string;
    material_id: string;
    material_label_en: string;
    material_label_hi?: string;
    material_label_mr?: string;
    category: string;
    hazardous: boolean;
    safety_note_en: string;
    safety_note_hi?: string;
    safety_note_mr?: string;
    weightKg: number;
    pricePerKg: number | null;
    estimatedValue: number | null;
    status: string;
    createdAt?: string;
  };

  recommendedRecyclers: unknown[];

  duplicate?: boolean;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response =
    await fetch(
      `${API_BASE}${path}`,
      {
        ...init,
        headers: {
          "Content-Type":
            "application/json",
          ...(init?.headers || {}),
        },
      }
    );

  if (!response.ok) {
    const message =
      await response.text();

    throw new Error(
      message ||
        `HTTP ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export async function getMaterials(): Promise<
  Material[]
> {
  return requestJson<Material[]>(
    "/api/materials"
  );
}

export async function getPrice(
  materialId: string,
  location: string
): Promise<PriceResponse> {
  const cacheKey =
    `price:${materialId}:${location}`;

  try {
    const result =
      await requestJson<PriceResponse>(
        `/api/price?material=${encodeURIComponent(
          materialId
        )}&location=${encodeURIComponent(
          location
        )}`
      );

    await cachePrice({
      key: cacheKey,
      material: materialId,
      location,
      latest: result.latest,
      buyingPricePerKg:
        result.buyingPricePerKg,
      marketRangeMin:
        result.marketRangeMin,
      marketRangeMax:
        result.marketRangeMax,
      cachedAt:
        new Date().toISOString(),
    });

    return result;
  } catch (error) {
    const cached =
      await getCachedPrice(
        cacheKey
      );

    if (cached) {
      return {
        material:
          cached.material,
        location:
          cached.location,
        latest:
          cached.latest,
        buyingPricePerKg:
          cached.buyingPricePerKg,
        marketRangeMin:
          cached.marketRangeMin,
        marketRangeMax:
          cached.marketRangeMax,
      };
    }

    throw error;
  }
}

export async function getRecyclerMatch(
  materialId: string,
  lat: number,
  lng: number
) {
  return requestJson<unknown[]>(
    `/api/recyclers/match?material=${encodeURIComponent(
      materialId
    )}&lat=${lat}&lng=${lng}`
  );
}

export async function createLot(
  payload: CreateLotPayload
): Promise<
  LotResponse | {
    queued: true;
    lot: CreateLotPayload;
  }
> {
  try {
    return await requestJson<LotResponse>(
      "/api/lots",
      {
        method: "POST",
        body: JSON.stringify(
          payload
        ),
      }
    );
  } catch (error) {
    if (
      typeof navigator !==
        "undefined" &&
      !navigator.onLine
    ) {
      await queueAction({
        id: `lot:${payload.clientLotId}`,
        type: "CREATE_LOT",
        payload: payload as unknown as Record<string, unknown>,
        createdAt:
          new Date().toISOString(),
        attempts: 0,
        status: "pending",
      });

      return {
        queued: true,
        lot: payload,
      };
    }

    throw error;
  }
}

export interface CreateTransactionPayload {
  clientTransactionId: string;
  lotId: string;
  collectorId: string;
  materialCode: string;
  weightKg: number;
  quotedPriceINR: number;
  finalPriceINR: number;
  recyclerId: string;
  paymentType?: "CASH" | "DIGITAL";
  collectionLat?: number;
  collectionLng?: number;
  handoverLat?: number;
  handoverLng?: number;
}

export async function createTransaction(
  payload: CreateTransactionPayload
) {
  try {
    const result =
      await requestJson<unknown>(
        "/api/transactions",
        {
          method: "POST",
          body: JSON.stringify(
            payload
          ),
        }
      );

    return {
      result,
      queued: false,
    };
  } catch (error) {
    if (
      typeof navigator !==
        "undefined" &&
      !navigator.onLine
    ) {
      await queueAction({
        id: `transaction:${payload.clientTransactionId}`,
        type: "CREATE_TRANSACTION",
        payload: payload as unknown as Record<string, unknown>,
        createdAt:
          new Date().toISOString(),
        attempts: 0,
        status: "pending",
      });

      return {
        result: payload,
        queued: true,
      };
    }

    throw error;
  }
}

export async function getLedger(
  collectorId: string
) {
  return requestJson<unknown>(
    `/api/ledger/${encodeURIComponent(
      collectorId
    )}`
  );
}

export async function askAssistant(
  text: string,
  lang: string,
  location: string
) {
  return requestJson<{
    answer: string;
  }>("/api/assistant", {
    method: "POST",
    body: JSON.stringify({
      text,
      lang,
      location,
    }),
  });
}