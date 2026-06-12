declare const COMPLAINT_INCLUDE: {
    readonly ward: {
        readonly select: {
            readonly name: true;
            readonly wardNumber: true;
        };
    };
    readonly reporter: {
        readonly select: {
            readonly name: true;
            readonly phone: true;
            readonly email: true;
        };
    };
    readonly attachments: true;
    readonly assignments: {
        readonly where: {
            readonly isActive: true;
        };
        readonly include: {
            readonly worker: {
                readonly select: {
                    readonly name: true;
                    readonly phone: true;
                };
            };
            readonly assignedBy: {
                readonly select: {
                    readonly name: true;
                    readonly role: true;
                };
            };
        };
        readonly orderBy: {
            readonly assignedAt: "desc";
        };
        readonly take: 1;
    };
};
export declare function resolveWardFromGPS(lat: number, lng: number): Promise<string | null>;
export declare function generateComplaintNumber(): Promise<string>;
export declare function getSummaryStats(): Promise<{
    total: any;
    pending: any;
    resolved: any;
    slaBreaches: any;
    resolutionRate: number;
    avgResolutionHours: number;
    byCategory: Record<string, number>;
    growthPct: number;
    drainAlerts: any;
    activeWorkers: any;
}>;
export declare function getWardStats(): Promise<any>;
export declare function getCategoryTrend(days: number): Promise<any>;
export declare function getSLAReport(): Promise<{
    categories: any[];
}>;
export { COMPLAINT_INCLUDE };
//# sourceMappingURL=complaint.service.d.ts.map