export declare function getWardsGeoJSON(): Promise<{
    type: "FeatureCollection";
    features: any;
}>;
export declare function getComplaintHeatmap(): Promise<{
    type: "FeatureCollection";
    features: any;
}>;
export declare function getComplaintPoints(filters?: Record<string, string>): Promise<{
    type: "FeatureCollection";
    features: any;
}>;
export declare function getDrainsGeoJSON(): Promise<{
    type: "FeatureCollection";
    features: any;
}>;
export declare function getTreesGeoJSON(wardId?: string): Promise<{
    type: "FeatureCollection";
    features: any;
}>;
export declare function getWaterPipesGeoJSON(): Promise<{
    pipes: {
        type: "FeatureCollection";
        features: any;
    };
    sensors: {
        type: "FeatureCollection";
        features: any;
    };
}>;
//# sourceMappingURL=gis.service.d.ts.map