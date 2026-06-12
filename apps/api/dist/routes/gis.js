"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const gis_service_1 = require("../services/gis.service");
const router = (0, express_1.Router)();
router.use(auth_1.optionalAuth);
// Cache headers — GIS data changes slowly
const GEO_CACHE = 'public, max-age=60, stale-while-revalidate=300';
const SENSOR_CACHE = 'public, max-age=30, stale-while-revalidate=60';
router.get('/wards', async (_req, res) => {
    try {
        res.set('Cache-Control', GEO_CACHE);
        res.json(await (0, gis_service_1.getWardsGeoJSON)());
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
router.get('/complaints/heatmap', async (_req, res) => {
    try {
        res.set('Cache-Control', GEO_CACHE);
        res.json(await (0, gis_service_1.getComplaintHeatmap)());
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
router.get('/complaints/points', async (req, res) => {
    try {
        res.set('Cache-Control', GEO_CACHE);
        res.json(await (0, gis_service_1.getComplaintPoints)(req.query));
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
router.get('/drains', async (_req, res) => {
    try {
        res.set('Cache-Control', SENSOR_CACHE);
        res.json(await (0, gis_service_1.getDrainsGeoJSON)());
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
router.get('/trees', async (req, res) => {
    try {
        res.set('Cache-Control', GEO_CACHE);
        res.json(await (0, gis_service_1.getTreesGeoJSON)(req.query.wardId));
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// Returns both pipe lines AND sensor points
router.get('/water-pipes', async (_req, res) => {
    try {
        res.set('Cache-Control', SENSOR_CACHE);
        const data = await (0, gis_service_1.getWaterPipesGeoJSON)();
        res.json(data.pipes); // pipe LineString GeoJSON
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
router.get('/water-sensors', async (_req, res) => {
    try {
        res.set('Cache-Control', SENSOR_CACHE);
        const data = await (0, gis_service_1.getWaterPipesGeoJSON)();
        res.json(data.sensors); // sensor point GeoJSON
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// Bounding box query — return complaints within map viewport
router.get('/complaints/bbox', async (req, res) => {
    try {
        const { west, south, east, north } = req.query;
        if (!west || !south || !east || !north) {
            return res.status(400).json({ error: 'west, south, east, north query params required' });
        }
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../utils/prisma')));
        const features = await prisma.complaint.findMany({
            where: {
                locationLat: { gte: parseFloat(south), lte: parseFloat(north) },
                locationLng: { gte: parseFloat(west), lte: parseFloat(east) },
                locationLat_not: null,
            },
            select: {
                id: true, complaintNumber: true, category: true, status: true,
                priorityScore: true, locationLat: true, locationLng: true,
                ward: { select: { name: true, wardNumber: true } },
            },
            take: 500,
        });
        res.json({
            type: 'FeatureCollection',
            features: features.map(c => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [c.locationLng, c.locationLat] },
                properties: c,
            })),
        });
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
exports.default = router;
//# sourceMappingURL=gis.js.map