-- Weather district dictionary + weather cache

CREATE TABLE IF NOT EXISTS weather_districts (
    district_id VARCHAR(12) PRIMARY KEY,
    province VARCHAR(32) NOT NULL,
    city VARCHAR(32) NOT NULL,
    city_geocode VARCHAR(12) NOT NULL,
    district VARCHAR(32) NOT NULL,
    district_geocode VARCHAR(12) NOT NULL,
    lon DOUBLE PRECISION,
    lat DOUBLE PRECISION,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_districts_province ON weather_districts(province);
CREATE INDEX IF NOT EXISTS idx_weather_districts_city ON weather_districts(city);
CREATE INDEX IF NOT EXISTS idx_weather_districts_district ON weather_districts(district);

CREATE TABLE IF NOT EXISTS weather_cache (
    cache_key VARCHAR(40) PRIMARY KEY,
    cache_fingerprint TEXT NOT NULL,
    payload JSONB NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weather_cache_expires_at ON weather_cache(expires_at);
