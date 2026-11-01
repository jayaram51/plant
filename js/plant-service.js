// ================================================================
// Smart Plant Monitoring — Plant Profile & Health Assessment Service
// Evaluates multi-sensor environmental parameters & generates care guidance
// ================================================================

export const DEFAULT_PLANT_PROFILE = {
    id: 'plant-01',
    name: 'Monstera Deliciosa',
    commonName: 'Swiss Cheese Plant',
    species: 'Monstera deliciosa Liebm.',
    family: 'Araceae',
    origin: 'Tropical rainforests of Central America',
    description: 'A vigorous tropical climber renowned for its distinctive glossy, fenestrated leaves. Thrives in warm, humid microclimates with evenly moist, well-aerated soil.',
    dateAdded: '2024-03-15',
    hardwareId: 'ESP32-NODE-01',
    environmentalRequirements: {
        moisture: {
            minOptimal: 35,
            maxOptimal: 65,
            criticalLow: 25,
            criticalHigh: 80,
            unit: '%',
            label: 'Soil Moisture'
        },
        temperature: {
            minOptimal: 20,
            maxOptimal: 28,
            criticalLow: 14,
            criticalHigh: 34,
            unit: '°C',
            label: 'Ambient Temperature'
        },
        humidity: {
            minOptimal: 50,
            maxOptimal: 75,
            criticalLow: 35,
            criticalHigh: 90,
            unit: '%',
            label: 'Relative Air Humidity'
        },
        light: 'Bright indirect filtered light (avoid direct midday sun)',
        soilType: 'Chunky, well-draining peat, perlite & orchid bark mix'
    }
};

/**
 * Assesses overall plant health from sensor readings.
 * Evaluates all 3 key parameters simultaneously.
 */
export function assessPlantHealth(sensorData, plantProfile = DEFAULT_PLANT_PROFILE) {
    if (!sensorData) {
        return {
            status: 'Insufficient Data',
            statusClass: 'neutral',
            color: '#94a3b8',
            score: null,
            summary: 'Awaiting sensor telemetry from Firebase Realtime Database.',
            conditions: [],
            recommendations: [
                'Ensure ESP32 microcontroller is powered and connected to Wi-Fi.',
                'Verify Firebase Realtime Database credentials and database rules.'
            ]
        };
    }

    const { soil_moisture, temperature_c, air_humidity } = sensorData;
    const reqs = plantProfile.environmentalRequirements;

    // Check count of available readings
    const validParams = [soil_moisture, temperature_c, air_humidity].filter(v => v != null && !isNaN(v));

    if (validParams.length < 2) {
        return {
            status: 'Insufficient Data',
            statusClass: 'neutral',
            color: '#94a3b8',
            score: null,
            summary: 'At least two environmental sensor parameters are required for a valid health diagnosis.',
            conditions: [],
            recommendations: [
                'Check hardware sensor connections (capacitive moisture sensor, DHT/SHT sensor).'
            ]
        };
    }

    const conditions = [];
    const recommendations = [];
    let penalties = 0;

    // 1. Evaluate Soil Moisture
    if (soil_moisture != null) {
        if (soil_moisture < reqs.moisture.criticalLow) {
            conditions.push({
                parameter: 'Soil Moisture',
                state: 'Critically Dry',
                level: 'critical',
                value: `${soil_moisture}%`,
                note: `Below critical minimum (${reqs.moisture.criticalLow}%)`
            });
            recommendations.push('Immediate root-zone hydration required. Run irrigation cycle or water thoroughly.');
            penalties += 45;
        } else if (soil_moisture < reqs.moisture.minOptimal) {
            conditions.push({
                parameter: 'Soil Moisture',
                state: 'Dry',
                level: 'warning',
                value: `${soil_moisture}%`,
                note: `Below optimal target (${reqs.moisture.minOptimal}%)`
            });
            recommendations.push('Soil moisture is depleting. Schedule irrigation within the next few hours.');
            penalties += 20;
        } else if (soil_moisture > reqs.moisture.criticalHigh) {
            conditions.push({
                parameter: 'Soil Moisture',
                state: 'Saturated',
                level: 'warning',
                value: `${soil_moisture}%`,
                note: `Above recommended upper limit (${reqs.moisture.criticalHigh}%)`
            });
            recommendations.push('Soil is saturated. Suspend automated irrigation to prevent root rot.');
            penalties += 25;
        } else {
            conditions.push({
                parameter: 'Soil Moisture',
                state: 'Optimal',
                level: 'optimal',
                value: `${soil_moisture}%`,
                note: `Within optimal range (${reqs.moisture.minOptimal}% - ${reqs.moisture.maxOptimal}%)`
            });
        }
    }

    // 2. Evaluate Ambient Temperature
    if (temperature_c != null) {
        if (temperature_c > reqs.temperature.criticalHigh) {
            conditions.push({
                parameter: 'Temperature',
                state: 'Extreme Heat',
                level: 'critical',
                value: `${temperature_c}°C`,
                note: `Exceeds thermal tolerance (${reqs.temperature.criticalHigh}°C)`
            });
            recommendations.push('Thermal stress detected. Move plant away from direct heat sources or improve ventilation.');
            penalties += 35;
        } else if (temperature_c > reqs.temperature.maxOptimal) {
            conditions.push({
                parameter: 'Temperature',
                state: 'Warm',
                level: 'warning',
                value: `${temperature_c}°C`,
                note: `Slightly above comfort zone (${reqs.temperature.maxOptimal}°C)`
            });
            recommendations.push('Warm ambient temperature accelerates evaporation. Monitor moisture levels closely.');
            penalties += 15;
        } else if (temperature_c < reqs.temperature.criticalLow) {
            conditions.push({
                parameter: 'Temperature',
                state: 'Cold Stress',
                level: 'critical',
                value: `${temperature_c}°C`,
                note: `Below minimum threshold (${reqs.temperature.criticalLow}°C)`
            });
            recommendations.push('Cold temperature can induce dormancy or leaf drop. Relocate to a warmer indoor position.');
            penalties += 35;
        } else if (temperature_c < reqs.temperature.minOptimal) {
            conditions.push({
                parameter: 'Temperature',
                state: 'Cool',
                level: 'warning',
                value: `${temperature_c}°C`,
                note: `Slightly cool for optimal tropical foliage`
            });
            penalties += 10;
        } else {
            conditions.push({
                parameter: 'Temperature',
                state: 'Optimal',
                level: 'optimal',
                value: `${temperature_c}°C`,
                note: `Ideal thermal bracket (${reqs.temperature.minOptimal}°C - ${reqs.temperature.maxOptimal}°C)`
            });
        }
    }

    // 3. Evaluate Relative Humidity
    if (air_humidity != null) {
        if (air_humidity < reqs.humidity.criticalLow) {
            conditions.push({
                parameter: 'Air Humidity',
                state: 'Arid',
                level: 'warning',
                value: `${air_humidity}%`,
                note: `Below tropical comfort minimum (${reqs.humidity.minOptimal}%)`
            });
            recommendations.push('Low relative humidity causes crispy leaf tips. Consider misting or placing near a humidifier.');
            penalties += 15;
        } else if (air_humidity < reqs.humidity.minOptimal) {
            conditions.push({
                parameter: 'Air Humidity',
                state: 'Moderate',
                level: 'warning',
                value: `${air_humidity}%`,
                note: `Slightly lower than optimal (${reqs.humidity.minOptimal}%)`
            });
            penalties += 5;
        } else {
            conditions.push({
                parameter: 'Air Humidity',
                state: 'Optimal',
                level: 'optimal',
                value: `${air_humidity}%`,
                note: `Well suited for tropical transpiration (${reqs.humidity.minOptimal}% - ${reqs.humidity.maxOptimal}%)`
            });
        }
    }

    // Calculate score (0 to 100)
    const score = Math.max(10, Math.min(100, 100 - penalties));

    // Determine status badge
    let status = 'Healthy';
    let statusClass = 'success';
    let color = '#10b981';
    let summary = 'Environmental parameters are well-balanced and conducive to vigorous leaf growth.';

    if (penalties >= 40) {
        status = 'Critical';
        statusClass = 'danger';
        color = '#ef4444';
        summary = 'Severe environmental stress detected. Immediate corrective action required.';
    } else if (penalties > 0) {
        status = 'Needs Attention';
        statusClass = 'warning';
        color = '#f59e0b';
        summary = 'One or more parameters deviate from optimal brackets. Review care recommendations.';
    }

    if (recommendations.length === 0) {
        recommendations.push('All parameters in optimal range. Continue current environmental maintenance schedule.');
    }

    return {
        status,
        statusClass,
        color,
        score,
        summary,
        conditions,
        recommendations
    };
}
