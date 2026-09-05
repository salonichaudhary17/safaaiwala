import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useTranslation,
} from "react-i18next";

import {
  createLot,
  getMaterials,
  getPrice,
  type Material,
  type CreateLotPayload,
} from "../lib/api";

import PriceSpeaker from "./PriceSpeaker";

interface LotCreationProps {
  collector: {
    id: string;
    location: string;
    lat: number;
    lng: number;
  };

  onCreated?: (
    result: unknown
  ) => void;
}

function createClientLotId() {
  if (
    typeof crypto !==
      "undefined" &&
    "randomUUID" in crypto
  ) {
    return `local-${crypto.randomUUID()}`;
  }

  return `local-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function LotCreation({
  collector,
  onCreated,
}: LotCreationProps) {
  const { t, i18n } =
    useTranslation();

  const [materials, setMaterials] =
    useState<Material[]>([]);

  const [materialCode, setMaterialCode] =
    useState("");

  const [weight, setWeight] =
    useState("");

  const [imageDataUrl, setImageDataUrl] =
    useState<string | null>(
      null
    );

  const [description, setDescription] =
    useState("");

  const [price, setPrice] =
    useState<number | null>(
      null
    );

  const [loadingMaterials, setLoadingMaterials] =
    useState(true);

  const [loadingPrice, setLoadingPrice] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const selectedMaterial =
    useMemo(
      () =>
        materials.find(
          (item) =>
            item.code ===
            materialCode
        ) || null,
      [
        materialCode,
        materials,
      ]
    );

  useEffect(() => {
    let mounted = true;

    getMaterials()
      .then((data) => {
        if (!mounted) {
          return;
        }

        setMaterials(data);

        if (
          data.length > 0
        ) {
          setMaterialCode(
            data[0].code
          );
        }
      })
      .catch(() => {
        if (mounted) {
          setMessage(
            t(
              "priceUnavailable"
            )
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingMaterials(
            false
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (
      !materialCode ||
      !collector.location
    ) {
      return;
    }

    let mounted = true;

    setLoadingPrice(true);

    getPrice(
      materialCode,
      collector.location
    )
      .then((result) => {
        if (mounted) {
          setPrice(
            result.buyingPricePerKg
          );
        }
      })
      .catch(() => {
        if (mounted) {
          setPrice(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingPrice(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    collector.location,
    materialCode,
  ]);

  function handlePhoto(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      return;
    }

    if (
      file.size >
      3 * 1024 * 1024
    ) {
      setMessage(
        "Photo must be smaller than 3 MB."
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      setImageDataUrl(
        String(
          reader.result
        )
      );
    };

    reader.readAsDataURL(
      file
    );
  }

  const numericWeight =
    Number(weight);

  const estimatedValue =
    price !== null &&
    Number.isFinite(
      numericWeight
    ) &&
    numericWeight > 0
      ? Math.round(
          price *
            numericWeight
        )
      : null;

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (
      !selectedMaterial ||
      !Number.isFinite(
        numericWeight
      ) ||
      numericWeight <= 0
    ) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    const payload: CreateLotPayload =
      {
        clientLotId:
          createClientLotId(),

        collectorId:
          collector.id,

        materialHint:
          selectedMaterial.code,

        hasPhoto:
          Boolean(
            imageDataUrl
          ),

        imageDataUrl,

        weightKg:
          numericWeight,

        location:
          collector.location,

        lat:
          collector.lat,

        lng:
          collector.lng,

        description,

        offlineCreated:
          !navigator.onLine,
      };

    try {
      const result =
        await createLot(
          payload
        );

      if (
        "queued" in
          result &&
        result.queued
      ) {
        setMessage(
          t("lotQueued")
        );
      } else {
        setMessage(
          t("lotSaved")
        );
      }

      onCreated?.(result);

      setWeight("");
      setDescription("");
      setImageDataUrl(null);
    } catch {
      setMessage(
        t(
          "priceUnavailable"
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  const materialLabel =
    selectedMaterial
      ? selectedMaterial[
          `label_${i18n.language}` as
            | "label_en"
            | "label_hi"
            | "label_mr"
        ] ||
        selectedMaterial.label_en
      : "";

  return (
    <form
      className="stack"
      onSubmit={
        handleSubmit
      }
    >
      <div className="h1">
        {t("createLot")}
      </div>

      <div className="card stack">
        <label>
          <div className="muted">
            {t("material")}
          </div>

          <select
            value={materialCode}
            onChange={(event) =>
              setMaterialCode(
                event.target
                  .value
              )
            }
            disabled={
              loadingMaterials
            }
          >
            {materials.map(
              (material) => (
                <option
                  key={
                    material.code
                  }
                  value={
                    material.code
                  }
                >
                  {material.label_en}
                </option>
              )
            )}
          </select>
        </label>

        {selectedMaterial &&
          selectedMaterial.hazardous && (
            <div
              className="card"
              role="alert"
            >
              <strong>
                {t("safety")}
              </strong>

              <p className="muted">
                {
                  selectedMaterial[
                    `safety_note_${i18n.language}` as
                      | "safety_note_en"
                      | "safety_note_hi"
                      | "safety_note_mr"
                  ]
                }
              </p>
            </div>
          )}

        <label>
          <div className="muted">
            {t("weightKg")}
          </div>

          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={weight}
            onChange={(event) =>
              setWeight(
                event.target
                  .value
              )
            }
            required
          />
        </label>

        <label>
          <div className="muted">
            {t("photo")}
          </div>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={
              handlePhoto
            }
          />
        </label>

        {imageDataUrl && (
          <div>
            <img
              src={
                imageDataUrl
              }
              alt={
                materialLabel ||
                t("photo")
              }
              style={{
                width: "100%",
                maxHeight: 240,
                objectFit:
                  "cover",
                borderRadius: 12,
              }}
            />
          </div>
        )}

        <label>
          <div className="muted">
            {t("description")}
          </div>

          <textarea
            value={
              description
            }
            onChange={(event) =>
              setDescription(
                event.target
                  .value
              )
            }
            rows={3}
          />
        </label>

        <div
          className="card"
          aria-live="polite"
        >
          <div className="muted">
            {t(
              "todaysPrice"
            )}
          </div>

          {loadingPrice ? (
            <strong>
              ...
            </strong>
          ) : price !== null ? (
            <>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                ₹
                {price.toFixed(
                  0
                )}
                /kg
              </div>

              <PriceSpeaker
                materialName={
                  materialLabel
                }
                price={price}
              />
            </>
          ) : (
            <div className="muted">
              {t(
                "priceUnavailable"
              )}
            </div>
          )}
        </div>

        {estimatedValue !==
          null && (
          <div
            className="card"
            style={{
              textAlign:
                "center",
            }}
          >
            <div className="muted">
              {t(
                "estimatedValue"
              )}
            </div>

            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              ₹
              {estimatedValue.toLocaleString(
                "en-IN"
              )}
            </div>
          </div>
        )}

        {!navigator.onLine && (
          <div
            className="card"
            role="status"
          >
            {t(
              "noInternet"
            )}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={
            submitting ||
            loadingMaterials ||
            !selectedMaterial ||
            numericWeight <=
              0
          }
        >
          {submitting
            ? t("syncing")
            : navigator.onLine
            ? t(
                "submitLot"
              )
            : t(
                "saveOffline"
              )}
        </button>

        {message && (
          <div
            className="card"
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        )}
      </div>
    </form>
  );
}