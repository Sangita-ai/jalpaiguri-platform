'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export type MapStyle = 'light' | 'dark' | 'satellite' | 'streets';

const STYLE_URLS: Record<MapStyle, string> = {
  light:     'mapbox://styles/mapbox/light-v11',
  dark:      'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets:   'mapbox://styles/mapbox/streets-v12',
};

export interface UseMapboxOptions {
  center?:    [number, number];
  zoom?:      number;
  style?:     MapStyle;
  onLoad?:    (map: any) => void;
  onError?:   (err: Error) => void;
}

export interface UseMapboxReturn {
  mapContainer: React.RefObject<HTMLDivElement>;
  map:          React.MutableRefObject<any>;
  isLoaded:     boolean;
  isError:      boolean;
  mapStyle:     MapStyle;
  changeStyle:  (s: MapStyle) => void;
  flyTo:        (lng: number, lat: number, zoom?: number) => void;
  resetView:    () => void;
  addLayer:     (layer: any, before?: string) => void;
  removeLayer:  (id: string) => void;
  setSource:    (id: string, data: any) => void;
  toggleLayer:  (id: string, visible: boolean) => void;
}

export function useMapbox(options: UseMapboxOptions = {}): UseMapboxReturn {
  const {
    center  = [88.7179, 26.5428],
    zoom    = 13.5,
    style   = 'light',
    onLoad,
    onError,
  } = options;

  const mapContainer = useRef<HTMLDivElement>(null);
  const map          = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError,  setIsError]  = useState(false);
  const [mapStyle,  setMapStyle] = useState<MapStyle>(style);
  const loadedLayers = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined' || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn('[Mapbox] No token — using fallback OpenStreetMap tiles');
      setIsError(true);
      return;
    }

    let mapboxgl: any;
    try {
      mapboxgl = require('mapbox-gl');
      mapboxgl.accessToken = token;
    } catch {
      setIsError(true);
      return;
    }

    if (!mapContainer.current) return;

    const instance = new mapboxgl.Map({
      container:   mapContainer.current,
      style:       STYLE_URLS[mapStyle],
      center,
      zoom,
      maxZoom:     18,
      minZoom:     10,
      attributionControl: false,
    });

    instance.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-left');
    instance.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
    instance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    instance.on('load', () => {
      setIsLoaded(true);
      loadedLayers.current.clear();
      onLoad?.(instance);
    });

    instance.on('error', (e: any) => {
      console.error('[Mapbox error]', e);
      onError?.(e.error ?? new Error('Map error'));
    });

    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
      setIsLoaded(false);
      loadedLayers.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeStyle = useCallback((s: MapStyle) => {
    setMapStyle(s);
    if (!map.current) return;
    map.current.setStyle(STYLE_URLS[s]);
    // Re-add custom layers after style loads
    map.current.once('styledata', () => {
      setIsLoaded(false);
      setTimeout(() => setIsLoaded(true), 800);
    });
  }, []);

  const flyTo = useCallback((lng: number, lat: number, zm = 15) => {
    map.current?.flyTo({ center: [lng, lat], zoom: zm, duration: 1200, essential: true });
  }, []);

  const resetView = useCallback(() => {
    map.current?.flyTo({ center, zoom, duration: 1000, essential: true });
  }, [center, zoom]);

  const addLayer = useCallback((layer: any, before?: string) => {
    if (!map.current || !isLoaded) return;
    if (map.current.getLayer(layer.id)) return;
    map.current.addLayer(layer, before);
    loadedLayers.current.add(layer.id);
  }, [isLoaded]);

  const removeLayer = useCallback((id: string) => {
    if (!map.current) return;
    if (map.current.getLayer(id)) map.current.removeLayer(id);
    loadedLayers.current.delete(id);
  }, []);

  const setSource = useCallback((id: string, data: any) => {
    if (!map.current || !isLoaded) return;
    const src = map.current.getSource(id);
    if (src) {
      src.setData(data);
    } else {
      map.current.addSource(id, { type: 'geojson', data, ...( data._clusterOptions ?? {}) });
    }
  }, [isLoaded]);

  const toggleLayer = useCallback((id: string, visible: boolean) => {
    if (!map.current) return;
    if (map.current.getLayer(id)) {
      map.current.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  }, []);

  return { mapContainer, map, isLoaded, isError, mapStyle, changeStyle, flyTo, resetView, addLayer, removeLayer, setSource, toggleLayer };
}
