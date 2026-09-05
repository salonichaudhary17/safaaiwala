const express = require("express");

const Recycler = require("../models/Recycler");
const Lot = require("../models/Lot");

const router = express.Router();

function haversineKm(
  lat1,
  lng1,
  lat2,
  lng2
) {
  const radius = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLng =
    ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(
      (lat1 * Math.PI) / 180
    ) *
      Math.cos(
        (lat2 * Math.PI) / 180
      ) *
      Math.sin(dLng / 2) ** 2;

  return (
    radius *
    2 *
    Math.asin(Math.sqrt(a))
  );
}

router.get("/", async (req, res) => {
  try {
    const recyclers =
      await Recycler.find({
        authorizationStatus:
          "AUTHORIZED",
        active: true,
      })
        .select(
          "-offeredRates._id"
        )
        .lean();

    const response =
      recyclers.map((recycler) => ({
        id: recycler._id,
        name: recycler.name,
        authorization_id:
          recycler.authorizationNumber,
        authorization_status:
          recycler.authorizationStatus.toLowerCase(),
        location:
          recycler.facilityLocation.address,
        city:
          recycler.facilityLocation.city,
        lat:
          recycler.facilityLocation
            .coordinates[1],
        lng:
          recycler.facilityLocation
            .coordinates[0],
        materials_accepted:
          recycler.materialsAccepted,
        pickup_available:
          recycler.pickupAvailable,
        service_area_km:
          recycler.serviceAreaRadiusKm,
        offered_rates:
          recycler.offeredRates,
      }));

    res.json(response);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Unable to load recyclers",
    });
  }
});

router.get("/match", async (req, res) => {
  try {
    const {
      material,
      lat,
      lng,
    } = req.query;

    const numericLat =
      Number(lat);

    const numericLng =
      Number(lng);

    if (
      !material ||
      !Number.isFinite(numericLat) ||
      !Number.isFinite(numericLng)
    ) {
      return res.status(400).json({
        error:
          "material, lat and lng are required",
      });
    }

    const recyclers =
      await Recycler.find({
        authorizationStatus:
          "AUTHORIZED",
        active: true,
        materialsAccepted:
          String(material).toLowerCase(),
      }).lean();

    const ranked =
      recyclers
        .map((recycler) => {
          const [
            recyclerLng,
            recyclerLat,
          ] =
            recycler.facilityLocation.coordinates;

          const distanceKm =
            haversineKm(
              numericLat,
              numericLng,
              recyclerLat,
              recyclerLng
            );

          const inRange =
            distanceKm <=
            recycler.serviceAreaRadiusKm;

          const rate =
            recycler.offeredRates.find(
              (item) =>
                item.materialCode ===
                String(
                  material
                ).toLowerCase()
            );

          const offeredRate =
            rate
              ? Number(
                  rate.pricePerKg
                )
              : 0;

          const score =
            (inRange ? 1 : 0.35) *
              (1 + offeredRate / 1000) *
              (recycler.pickupAvailable
                ? 1.15
                : 1) -
            distanceKm * 0.01;

          return {
            id: recycler._id,
            name: recycler.name,
            authorization_id:
              recycler.authorizationNumber,
            authorization_status:
              recycler.authorizationStatus.toLowerCase(),
            location:
              recycler.facilityLocation
                .address,
            city:
              recycler.facilityLocation
                .city,
            lat: recyclerLat,
            lng: recyclerLng,
            materials_accepted:
              recycler.materialsAccepted,
            pickup_available:
              recycler.pickupAvailable,
            service_area_km:
              recycler.serviceAreaRadiusKm,
            offeredPricePerKg:
              offeredRate || null,
            distanceKm:
              Math.round(
                distanceKm * 10
              ) / 10,
            inRange,
            score,
          };
        })
        .sort(
          (a, b) =>
            b.score - a.score
        );

    res.json(ranked);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error:
        "Unable to match recyclers",
    });
  }
});

router.get(
  "/dashboard/:recyclerId",
  async (req, res) => {
    try {
      const recycler =
        await Recycler.findById(
          req.params.recyclerId
        ).lean();

      if (!recycler) {
        return res.status(404).json({
          error: "Recycler not found",
        });
      }

      const lots =
        await Lot.find({
          status: {
            $in: [
              "MATCHED",
              "HANDOVER_PENDING",
            ],
          },

          materialCode: {
            $in:
              recycler.materialsAccepted,
          },
        })
          .sort({
            createdAt: -1,
          })
          .limit(100)
          .lean();

      const matches =
        lots.map((lot) => {
          const [
            lng,
            lat,
          ] =
            lot.collectionLocation.coordinates;

          const [
            recyclerLng,
            recyclerLat,
          ] =
            recycler.facilityLocation.coordinates;

          const distanceKm =
            haversineKm(
              lat,
              lng,
              recyclerLat,
              recyclerLng
            );

          return {
            ...lot,
            distanceKm:
              Math.round(
                distanceKm * 10
              ) / 10,
            withinServiceArea:
              distanceKm <=
              recycler.serviceAreaRadiusKm,
          };
        });

      res.json({
        recycler: {
          id: recycler._id,
          name: recycler.name,
          authorizationNumber:
            recycler.authorizationNumber,
        },

        matches,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Unable to load recycler dashboard",
      });
    }
  }
);

module.exports = router;
