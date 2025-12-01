// Comprehensive Unit Definitions
// All units with conversion factors to SI base units

// Base dimensions
const BASE_DIMENSIONS = {
  LENGTH: 'length',
  AREA: 'area',
  VOLUME: 'volume',
  MASS: 'mass',
  TIME: 'time',
  TEMPERATURE: 'temperature',
  SPEED: 'speed',
  ACCELERATION: 'acceleration',
  FORCE: 'force',
  ENERGY: 'energy',
  POWER: 'power',
  PRESSURE: 'pressure',
  DENSITY: 'density',
  FLOW_RATE_VOLUME: 'flow_rate_volume',
  FLOW_RATE_MASS: 'flow_rate_mass',
  ANGLE: 'angle',
  SOLID_ANGLE: 'solid_angle',
  FREQUENCY: 'frequency',
  CURRENT: 'current',
  CHARGE: 'charge',
  VOLTAGE: 'voltage',
  RESISTANCE: 'resistance',
  CONDUCTANCE: 'conductance',
  CAPACITANCE: 'capacitance',
  INDUCTANCE: 'inductance',
  MAGNETIC_FLUX: 'magnetic_flux',
  MAGNETIC_FLUX_DENSITY: 'magnetic_flux_density',
  LUMINOUS_INTENSITY: 'luminous_intensity',
  LUMINOUS_FLUX: 'luminous_flux',
  ILLUMINANCE: 'illuminance',
  LUMINANCE: 'luminance',
  RADIOACTIVITY: 'radioactivity',
  ABSORBED_DOSE: 'absorbed_dose',
  DOSE_EQUIVALENT: 'dose_equivalent',
  DATA: 'data',
  DATA_RATE: 'data_rate',
  FUEL_CONSUMPTION: 'fuel_consumption',
  TORQUE: 'torque',
  VISCOSITY_DYNAMIC: 'viscosity_dynamic',
  VISCOSITY_KINEMATIC: 'viscosity_kinematic',
  SURFACE_TENSION: 'surface_tension',
  THERMAL_CONDUCTIVITY: 'thermal_conductivity',
  THERMAL_RESISTANCE: 'thermal_resistance',
  SPECIFIC_HEAT: 'specific_heat',
  CONCENTRATION_MASS: 'concentration_mass',
  CONCENTRATION_MOLAR: 'concentration_molar',
  TYPOGRAPHY: 'typography'
};

// Categories
export const CATEGORIES = [
  { id: 'length', name: 'Length / Distance' },
  { id: 'area', name: 'Area' },
  { id: 'volume', name: 'Volume' },
  { id: 'mass', name: 'Mass / Weight' },
  { id: 'time', name: 'Time' },
  { id: 'temperature', name: 'Temperature' },
  { id: 'speed', name: 'Speed / Velocity' },
  { id: 'acceleration', name: 'Acceleration' },
  { id: 'force', name: 'Force' },
  { id: 'energy', name: 'Energy / Work / Heat' },
  { id: 'power', name: 'Power' },
  { id: 'pressure', name: 'Pressure / Stress' },
  { id: 'density', name: 'Density' },
  { id: 'flow_rate', name: 'Flow Rate' },
  { id: 'angle', name: 'Angle' },
  { id: 'solid_angle', name: 'Solid Angle' },
  { id: 'frequency', name: 'Frequency' },
  { id: 'electrical', name: 'Electrical' },
  { id: 'magnetic', name: 'Magnetic' },
  { id: 'photometry', name: 'Photometry / Light' },
  { id: 'radiation', name: 'Radiation / Radioactivity' },
  { id: 'data', name: 'Data / Information' },
  { id: 'fuel', name: 'Fuel Consumption' },
  { id: 'torque', name: 'Torque' },
  { id: 'viscosity', name: 'Viscosity' },
  { id: 'thermal', name: 'Thermal Properties' },
  { id: 'concentration', name: 'Concentration' },
  { id: 'typography', name: 'Typography' }
];

// Unit definitions object
// Format: { id: { name, symbol, plural, category, categoryName, baseDimension, multiplier, offset, system, notes, hasOffset } }
export const UNIT_DEFINITIONS = {};

// Helper function to add units
function addUnits(units) {
  units.forEach(unit => {
    UNIT_DEFINITIONS[unit.id] = unit;
  });
}

// ============================================================================
// 1. LENGTH / DISTANCE
// ============================================================================

addUnits([
  // Core metric
  { id: 'meter', name: 'meter', symbol: 'm', plural: 'meters', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 1, system: 'SI' },
  { id: 'kilometer', name: 'kilometer', symbol: 'km', plural: 'kilometers', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 1000, system: 'SI' },
  { id: 'centimeter', name: 'centimeter', symbol: 'cm', plural: 'centimeters', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.01, system: 'SI' },
  { id: 'millimeter', name: 'millimeter', symbol: 'mm', plural: 'millimeters', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.001, system: 'SI' },
  { id: 'micrometer', name: 'micrometer', symbol: 'µm', plural: 'micrometers', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 1e-6, system: 'SI' },
  { id: 'nanometer', name: 'nanometer', symbol: 'nm', plural: 'nanometers', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 1e-9, system: 'SI' },
  { id: 'picometer', name: 'picometer', symbol: 'pm', plural: 'picometers', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 1e-12, system: 'SI' },
  
  // Imperial / US customary
  { id: 'inch', name: 'inch', symbol: 'in', plural: 'inches', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.0254, system: 'Imperial' },
  { id: 'foot', name: 'foot', symbol: 'ft', plural: 'feet', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.3048, system: 'Imperial' },
  { id: 'yard', name: 'yard', symbol: 'yd', plural: 'yards', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.9144, system: 'Imperial' },
  { id: 'mile', name: 'mile', symbol: 'mi', plural: 'miles', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 1609.344, system: 'Imperial', notes: 'statute mile' },
  { id: 'mil', name: 'mil', symbol: 'mil', plural: 'mils', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.0000254, system: 'Imperial', notes: 'thou' },
  { id: 'hand', name: 'hand', symbol: 'hand', plural: 'hands', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.1016, system: 'Imperial' },
  { id: 'furlong', name: 'furlong', symbol: 'furlong', plural: 'furlongs', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 201.168, system: 'Imperial' },
  { id: 'chain', name: 'chain', symbol: 'chain', plural: 'chains', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 20.1168, system: 'Imperial' },
  { id: 'rod', name: 'rod', symbol: 'rod', plural: 'rods', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 5.0292, system: 'Imperial', notes: 'pole / perch' },
  { id: 'league', name: 'league', symbol: 'league', plural: 'leagues', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 4828.032, system: 'Imperial', notes: 'land league' },
  
  // Astronomical
  { id: 'astronomical_unit', name: 'astronomical unit', symbol: 'AU', plural: 'astronomical units', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 149597870700, system: 'Astronomical' },
  { id: 'light_year', name: 'light-year', symbol: 'ly', plural: 'light-years', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 9460730472580800, system: 'Astronomical' },
  { id: 'parsec', name: 'parsec', symbol: 'pc', plural: 'parsecs', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 30856775814913672, system: 'Astronomical' },
  { id: 'kiloparsec', name: 'kiloparsec', symbol: 'kpc', plural: 'kiloparsecs', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 30856775814913672000, system: 'Astronomical' },
  { id: 'megaparsec', name: 'megaparsec', symbol: 'Mpc', plural: 'megaparsecs', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 30856775814913672000000, system: 'Astronomical' },
  { id: 'light_second', name: 'light-second', symbol: 'ls', plural: 'light-seconds', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 299792458, system: 'Astronomical' },
  { id: 'light_minute', name: 'light-minute', symbol: 'lmin', plural: 'light-minutes', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 17987547480, system: 'Astronomical' },
  { id: 'light_hour', name: 'light-hour', symbol: 'lh', plural: 'light-hours', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 1079022848800, system: 'Astronomical' },
  { id: 'light_day', name: 'light-day', symbol: 'ld', plural: 'light-days', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 25900548371200, system: 'Astronomical' },
  
  // Nautical / geodesic
  { id: 'nautical_mile', name: 'nautical mile', symbol: 'nmi', plural: 'nautical miles', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 1852, system: 'Nautical' },
  { id: 'cable', name: 'cable', symbol: 'cable', plural: 'cables', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 185.2, system: 'Nautical' },
  { id: 'fathom', name: 'fathom', symbol: 'fathom', plural: 'fathoms', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 1.8288, system: 'Nautical' },
  
  // Others / historical
  { id: 'angstrom', name: 'angstrom', symbol: 'Å', plural: 'angstroms', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 1e-10, system: 'Scientific' },
  { id: 'arpent', name: 'arpent', symbol: 'arpent', plural: 'arpents', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 58.4713, system: 'Historical' },
  { id: 'cubit', name: 'cubit', symbol: 'cubit', plural: 'cubits', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.4572, system: 'Historical' },
  { id: 'span', name: 'span', symbol: 'span', plural: 'spans', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.2286, system: 'Historical' },
  { id: 'palm', name: 'palm', symbol: 'palm', plural: 'palms', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.0762, system: 'Historical' },
  { id: 'finger', name: 'finger', symbol: 'finger', plural: 'fingers', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.1143, system: 'Historical' },
  { id: 'ell', name: 'ell', symbol: 'ell', plural: 'ells', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 1.143, system: 'Historical' },
  { id: 'link', name: 'link', symbol: 'link', plural: 'links', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.201168, system: 'Historical', notes: "Gunter's link" },
  { id: 'roman_mile', name: 'Roman mile', symbol: 'roman mile', plural: 'Roman miles', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 1478.5, system: 'Historical' },
  { id: 'roman_foot', name: 'Roman foot', symbol: 'roman foot', plural: 'Roman feet', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.296, system: 'Historical' },
  { id: 'chi', name: 'chi', symbol: 'chi', plural: 'chi', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.3333, system: 'Cultural', notes: 'Chinese' },
  { id: 'cun', name: 'cun', symbol: 'cun', plural: 'cun', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 0.03333, system: 'Cultural', notes: 'Chinese' },
  { id: 'zhang', name: 'zhang', symbol: 'zhang', plural: 'zhang', category: 'length', categoryName: 'Length', baseDimension: BASE_DIMENSIONS.LENGTH, multiplier: 3.333, system: 'Cultural', notes: 'Chinese' }
]);

// ============================================================================
// 2. AREA
// ============================================================================

addUnits([
  // Metric
  { id: 'square_meter', name: 'square meter', symbol: 'm²', plural: 'square meters', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 1, system: 'SI' },
  { id: 'square_kilometer', name: 'square kilometer', symbol: 'km²', plural: 'square kilometers', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 1000000, system: 'SI' },
  { id: 'square_centimeter', name: 'square centimeter', symbol: 'cm²', plural: 'square centimeters', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 0.0001, system: 'SI' },
  { id: 'square_millimeter', name: 'square millimeter', symbol: 'mm²', plural: 'square millimeters', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 0.000001, system: 'SI' },
  { id: 'hectare', name: 'hectare', symbol: 'ha', plural: 'hectares', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 10000, system: 'SI' },
  { id: 'are', name: 'are', symbol: 'a', plural: 'ares', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 100, system: 'SI' },
  
  // Imperial / US
  { id: 'square_inch', name: 'square inch', symbol: 'in²', plural: 'square inches', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 0.00064516, system: 'Imperial' },
  { id: 'square_foot', name: 'square foot', symbol: 'ft²', plural: 'square feet', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 0.092903, system: 'Imperial' },
  { id: 'square_yard', name: 'square yard', symbol: 'yd²', plural: 'square yards', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 0.836127, system: 'Imperial' },
  { id: 'square_mile', name: 'square mile', symbol: 'mi²', plural: 'square miles', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 2589988.11, system: 'Imperial' },
  { id: 'acre', name: 'acre', symbol: 'acre', plural: 'acres', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 4046.86, system: 'Imperial' },
  { id: 'rood', name: 'rood', symbol: 'rood', plural: 'roods', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 1011.71, system: 'Imperial' },
  { id: 'township', name: 'township', symbol: 'township', plural: 'townships', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 93239571.97, system: 'US', notes: 'US Public Land Survey' },
  
  // Other / niche
  { id: 'barn', name: 'barn', symbol: 'b', plural: 'barns', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 1e-28, system: 'Scientific', notes: 'nuclear physics' },
  { id: 'circular_mil', name: 'circular mil', symbol: 'cmil', plural: 'circular mils', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 5.067075e-10, system: 'US' },
  { id: 'section', name: 'section', symbol: 'section', plural: 'sections', category: 'area', categoryName: 'Area', baseDimension: BASE_DIMENSIONS.AREA, multiplier: 2589988.11, system: 'US', notes: '1 mi² in land survey' }
]);

// ============================================================================
// 3. VOLUME
// ============================================================================

addUnits([
  // Metric
  { id: 'cubic_meter', name: 'cubic meter', symbol: 'm³', plural: 'cubic meters', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 1, system: 'SI' },
  { id: 'cubic_centimeter', name: 'cubic centimeter', symbol: 'cm³', plural: 'cubic centimeters', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.000001, system: 'SI' },
  { id: 'cubic_millimeter', name: 'cubic millimeter', symbol: 'mm³', plural: 'cubic millimeters', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 1e-9, system: 'SI' },
  { id: 'liter', name: 'liter', symbol: 'L', plural: 'liters', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.001, system: 'SI' },
  { id: 'milliliter', name: 'milliliter', symbol: 'mL', plural: 'milliliters', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.000001, system: 'SI' },
  { id: 'cubic_decimeter', name: 'cubic decimeter', symbol: 'dm³', plural: 'cubic decimeters', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.001, system: 'SI' },
  
  // Imperial / US - Cubic
  { id: 'cubic_inch', name: 'cubic inch', symbol: 'in³', plural: 'cubic inches', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.000016387064, system: 'Imperial' },
  { id: 'cubic_foot', name: 'cubic foot', symbol: 'ft³', plural: 'cubic feet', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.028316846592, system: 'Imperial' },
  { id: 'cubic_yard', name: 'cubic yard', symbol: 'yd³', plural: 'cubic yards', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.764554857984, system: 'Imperial' },
  
  // US liquid
  { id: 'us_gallon', name: 'US gallon', symbol: 'US gal', plural: 'US gallons', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.003785411784, system: 'US' },
  { id: 'us_quart', name: 'US quart', symbol: 'US qt', plural: 'US quarts', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.000946352946, system: 'US' },
  { id: 'us_pint', name: 'US pint', symbol: 'US pt', plural: 'US pints', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.000473176473, system: 'US' },
  { id: 'us_cup', name: 'US cup', symbol: 'US cup', plural: 'US cups', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.0002365882365, system: 'US' },
  { id: 'us_fluid_ounce', name: 'US fluid ounce', symbol: 'US fl oz', plural: 'US fluid ounces', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.0000295735295625, system: 'US' },
  { id: 'us_tablespoon', name: 'US tablespoon', symbol: 'US tbsp', plural: 'US tablespoons', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.00001478676478125, system: 'US' },
  { id: 'us_teaspoon', name: 'US teaspoon', symbol: 'US tsp', plural: 'US teaspoons', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.00000492892159375, system: 'US' },
  { id: 'us_gill', name: 'US gill', symbol: 'US gi', plural: 'US gills', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.00011829411825, system: 'US' },
  
  // US dry
  { id: 'us_dry_gallon', name: 'US dry gallon', symbol: 'US dry gal', plural: 'US dry gallons', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.00440488377086, system: 'US' },
  { id: 'us_bushel', name: 'US bushel', symbol: 'US bu', plural: 'US bushels', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.03523907016688, system: 'US' },
  { id: 'us_peck', name: 'US peck', symbol: 'US pk', plural: 'US pecks', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.00880976754172, system: 'US' },
  { id: 'us_dry_quart', name: 'US dry quart', symbol: 'US dry qt', plural: 'US dry quarts', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.001101220942715, system: 'US' },
  { id: 'us_dry_pint', name: 'US dry pint', symbol: 'US dry pt', plural: 'US dry pints', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.0005506104713575, system: 'US' },
  
  // Imperial (UK)
  { id: 'imperial_gallon', name: 'Imperial gallon', symbol: 'imp gal', plural: 'Imperial gallons', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.00454609, system: 'Imperial' },
  { id: 'imperial_quart', name: 'Imperial quart', symbol: 'imp qt', plural: 'Imperial quarts', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.0011365225, system: 'Imperial' },
  { id: 'imperial_pint', name: 'Imperial pint', symbol: 'imp pt', plural: 'Imperial pints', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.00056826125, system: 'Imperial' },
  { id: 'imperial_fluid_ounce', name: 'Imperial fluid ounce', symbol: 'imp fl oz', plural: 'Imperial fluid ounces', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.0000284130625, system: 'Imperial' },
  { id: 'imperial_gill', name: 'Imperial gill', symbol: 'imp gi', plural: 'Imperial gills', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.0001420653125, system: 'Imperial' },
  
  // Other / specialized
  { id: 'barrel_oil', name: 'barrel (oil)', symbol: 'bbl', plural: 'barrels', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.158987294928, system: 'US', notes: 'oil barrel' },
  { id: 'barrel_beer', name: 'barrel (beer)', symbol: 'bbl', plural: 'barrels', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.117347765304, system: 'US', notes: 'beer barrel' },
  { id: 'board_foot', name: 'board foot', symbol: 'BF', plural: 'board feet', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.002359737216, system: 'US' },
  { id: 'register_ton', name: 'register ton', symbol: 'RT', plural: 'register tons', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 2.8316846592, system: 'Shipping' },
  { id: 'drop', name: 'drop', symbol: 'gtt', plural: 'drops', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 0.00000005, system: 'Medical', notes: 'approximate' },
  { id: 'stere', name: 'stere', symbol: 'st', plural: 'steres', category: 'volume', categoryName: 'Volume', baseDimension: BASE_DIMENSIONS.VOLUME, multiplier: 1, system: 'SI', notes: '1 m³ firewood' }
]);

// ============================================================================
// 4. MASS / WEIGHT
// ============================================================================

addUnits([
  // Metric
  { id: 'kilogram', name: 'kilogram', symbol: 'kg', plural: 'kilograms', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 1, system: 'SI' },
  { id: 'gram', name: 'gram', symbol: 'g', plural: 'grams', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.001, system: 'SI' },
  { id: 'milligram', name: 'milligram', symbol: 'mg', plural: 'milligrams', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.000001, system: 'SI' },
  { id: 'microgram', name: 'microgram', symbol: 'µg', plural: 'micrograms', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 1e-9, system: 'SI' },
  { id: 'metric_tonne', name: 'metric tonne', symbol: 't', plural: 'metric tonnes', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 1000, system: 'SI' },
  { id: 'nanogram', name: 'nanogram', symbol: 'ng', plural: 'nanograms', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 1e-12, system: 'SI' },
  { id: 'picogram', name: 'picogram', symbol: 'pg', plural: 'picograms', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 1e-15, system: 'SI' },
  
  // Imperial / US
  { id: 'pound', name: 'pound', symbol: 'lb', plural: 'pounds', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.45359237, system: 'Imperial' },
  { id: 'ounce', name: 'ounce', symbol: 'oz', plural: 'ounces', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.028349523125, system: 'Imperial' },
  { id: 'stone', name: 'stone', symbol: 'st', plural: 'stones', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 6.35029318, system: 'Imperial' },
  { id: 'grain', name: 'grain', symbol: 'gr', plural: 'grains', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.00006479891, system: 'Imperial' },
  { id: 'hundredweight_short', name: 'hundredweight (short)', symbol: 'cwt', plural: 'hundredweights', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 45.359237, system: 'US', notes: 'short cwt' },
  { id: 'hundredweight_long', name: 'hundredweight (long)', symbol: 'cwt', plural: 'hundredweights', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 50.80234544, system: 'Imperial', notes: 'long cwt' },
  { id: 'short_ton', name: 'short ton', symbol: 'ton', plural: 'short tons', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 907.18474, system: 'US' },
  { id: 'long_ton', name: 'long ton', symbol: 'long ton', plural: 'long tons', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 1016.0469088, system: 'Imperial' },
  
  // Atomic / scientific
  { id: 'dalton', name: 'Dalton', symbol: 'Da', plural: 'Daltons', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 1.66053906660e-27, system: 'Scientific', notes: 'unified atomic mass unit' },
  { id: 'electron_mass', name: 'electron mass', symbol: 'me', plural: 'electron masses', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 9.1093837015e-31, system: 'Scientific' },
  { id: 'solar_mass', name: 'solar mass', symbol: 'M☉', plural: 'solar masses', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 1.98847e30, system: 'Astronomical' },
  
  // Other / historical
  { id: 'carat', name: 'carat', symbol: 'ct', plural: 'carats', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.0002, system: 'Jewelry' },
  { id: 'slug', name: 'slug', symbol: 'slug', plural: 'slugs', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 14.5939029372, system: 'Imperial', notes: 'mass unit in imperial mechanics' },
  { id: 'dram_avoirdupois', name: 'dram (avoirdupois)', symbol: 'dr', plural: 'drams', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.0017718451953125, system: 'Imperial' },
  { id: 'dram_apothecary', name: 'dram (apothecary)', symbol: 'dr ap', plural: 'drams', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.0038879346, system: 'Apothecary' },
  { id: 'scruple', name: 'scruple', symbol: 's ap', plural: 'scruples', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.0012959782, system: 'Apothecary' },
  { id: 'tola', name: 'tola', symbol: 'tola', plural: 'tolas', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.0116638, system: 'Cultural', notes: 'South Asia' },
  { id: 'tael', name: 'tael', symbol: 'tael', plural: 'taels', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.0375, system: 'Cultural', notes: 'Chinese' },
  { id: 'talent', name: 'talent', symbol: 'talent', plural: 'talents', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 30, system: 'Historical', notes: 'ancient' },
  { id: 'mina', name: 'mina', symbol: 'mina', plural: 'minas', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.5, system: 'Historical', notes: 'ancient' },
  { id: 'shekel', name: 'shekel', symbol: 'shekel', plural: 'shekels', category: 'mass', categoryName: 'Mass', baseDimension: BASE_DIMENSIONS.MASS, multiplier: 0.0115, system: 'Historical', notes: 'ancient' }
]);

// ============================================================================
// 5. TIME
// ============================================================================

addUnits([
  // Standard
  { id: 'second', name: 'second', symbol: 's', plural: 'seconds', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 1, system: 'SI' },
  { id: 'millisecond', name: 'millisecond', symbol: 'ms', plural: 'milliseconds', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 0.001, system: 'SI' },
  { id: 'microsecond', name: 'microsecond', symbol: 'µs', plural: 'microseconds', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 1e-6, system: 'SI' },
  { id: 'nanosecond', name: 'nanosecond', symbol: 'ns', plural: 'nanoseconds', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 1e-9, system: 'SI' },
  { id: 'picosecond', name: 'picosecond', symbol: 'ps', plural: 'picoseconds', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 1e-12, system: 'SI' },
  { id: 'minute', name: 'minute', symbol: 'min', plural: 'minutes', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 60, system: 'Common' },
  { id: 'hour', name: 'hour', symbol: 'h', plural: 'hours', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 3600, system: 'Common' },
  { id: 'day', name: 'day', symbol: 'd', plural: 'days', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 86400, system: 'Common' },
  { id: 'week', name: 'week', symbol: 'wk', plural: 'weeks', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 604800, system: 'Common' },
  { id: 'fortnight', name: 'fortnight', symbol: 'fortnight', plural: 'fortnights', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 1209600, system: 'Common' },
  
  // Calendar (approximate)
  { id: 'month', name: 'month', symbol: 'mo', plural: 'months', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 2629746, system: 'Calendar', notes: 'average month (30.44 days)' },
  { id: 'year', name: 'year', symbol: 'yr', plural: 'years', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 31556952, system: 'Calendar', notes: 'calendar year' },
  { id: 'julian_year', name: 'Julian year', symbol: 'yr', plural: 'Julian years', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 31557600, system: 'Calendar', notes: 'Julian year' },
  { id: 'tropical_year', name: 'tropical year', symbol: 'yr', plural: 'tropical years', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 31556925.2, system: 'Calendar', notes: 'tropical year' },
  { id: 'sidereal_year', name: 'sidereal year', symbol: 'yr', plural: 'sidereal years', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 31558149.8, system: 'Calendar', notes: 'sidereal year' },
  { id: 'decade', name: 'decade', symbol: 'decade', plural: 'decades', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 315569520, system: 'Calendar' },
  { id: 'century', name: 'century', symbol: 'century', plural: 'centuries', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 3155695200, system: 'Calendar' },
  
  // Other
  { id: 'shake', name: 'shake', symbol: 'shake', plural: 'shakes', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 1e-8, system: 'Scientific', notes: 'nuclear (10⁻⁸ s)' },
  { id: 'sidereal_day', name: 'sidereal day', symbol: 'sidereal day', plural: 'sidereal days', category: 'time', categoryName: 'Time', baseDimension: BASE_DIMENSIONS.TIME, multiplier: 86164.0905, system: 'Astronomical' }
]);

// ============================================================================
// 6. TEMPERATURE
// ============================================================================

addUnits([
  // Note: Temperature conversions require offsets
  { id: 'kelvin', name: 'Kelvin', symbol: 'K', plural: 'Kelvin', category: 'temperature', categoryName: 'Temperature', baseDimension: BASE_DIMENSIONS.TEMPERATURE, multiplier: 1, offset: 0, hasOffset: false, system: 'SI' },
  { id: 'celsius', name: 'Celsius', symbol: '°C', plural: 'Celsius', category: 'temperature', categoryName: 'Temperature', baseDimension: BASE_DIMENSIONS.TEMPERATURE, multiplier: 1, offset: 273.15, hasOffset: true, system: 'SI' },
  { id: 'fahrenheit', name: 'Fahrenheit', symbol: '°F', plural: 'Fahrenheit', category: 'temperature', categoryName: 'Temperature', baseDimension: BASE_DIMENSIONS.TEMPERATURE, multiplier: 5/9, offset: 459.67, hasOffset: true, system: 'Imperial' },
  { id: 'rankine', name: 'Rankine', symbol: '°R', plural: 'Rankine', category: 'temperature', categoryName: 'Temperature', baseDimension: BASE_DIMENSIONS.TEMPERATURE, multiplier: 5/9, offset: 0, hasOffset: true, system: 'Imperial' },
  { id: 'reaumur', name: 'Réaumur', symbol: '°Ré', plural: 'Réaumur', category: 'temperature', categoryName: 'Temperature', baseDimension: BASE_DIMENSIONS.TEMPERATURE, multiplier: 1.25, offset: 273.15, hasOffset: true, system: 'Historical' }
]);

// ============================================================================
// 7. SPEED / VELOCITY
// ============================================================================

addUnits([
  // Linear speed
  { id: 'meter_per_second', name: 'meter per second', symbol: 'm/s', plural: 'meters per second', category: 'speed', categoryName: 'Speed', baseDimension: BASE_DIMENSIONS.SPEED, multiplier: 1, system: 'SI' },
  { id: 'kilometer_per_hour', name: 'kilometer per hour', symbol: 'km/h', plural: 'kilometers per hour', category: 'speed', categoryName: 'Speed', baseDimension: BASE_DIMENSIONS.SPEED, multiplier: 0.27777777777778, system: 'SI' },
  { id: 'mile_per_hour', name: 'mile per hour', symbol: 'mph', plural: 'miles per hour', category: 'speed', categoryName: 'Speed', baseDimension: BASE_DIMENSIONS.SPEED, multiplier: 0.44704, system: 'Imperial' },
  { id: 'foot_per_second', name: 'foot per second', symbol: 'ft/s', plural: 'feet per second', category: 'speed', categoryName: 'Speed', baseDimension: BASE_DIMENSIONS.SPEED, multiplier: 0.3048, system: 'Imperial' },
  { id: 'knot', name: 'knot', symbol: 'kn', plural: 'knots', category: 'speed', categoryName: 'Speed', baseDimension: BASE_DIMENSIONS.SPEED, multiplier: 0.51444444444444, system: 'Nautical', notes: 'nautical miles per hour' },
  { id: 'mach', name: 'Mach', symbol: 'Ma', plural: 'Mach', category: 'speed', categoryName: 'Speed', baseDimension: BASE_DIMENSIONS.SPEED, multiplier: 343, system: 'Scientific', notes: 'Mach 1 at sea level, 15°C' },
  { id: 'speed_of_light', name: 'speed of light', symbol: 'c', plural: 'speed of light', category: 'speed', categoryName: 'Speed', baseDimension: BASE_DIMENSIONS.SPEED, multiplier: 299792458, system: 'Scientific' },
  
  // Angular speed
  { id: 'radian_per_second', name: 'radian per second', symbol: 'rad/s', plural: 'radians per second', category: 'speed', categoryName: 'Speed', baseDimension: BASE_DIMENSIONS.SPEED, multiplier: 1, system: 'SI', notes: 'angular speed' },
  { id: 'degree_per_second', name: 'degree per second', symbol: '°/s', plural: 'degrees per second', category: 'speed', categoryName: 'Speed', baseDimension: BASE_DIMENSIONS.SPEED, multiplier: 0.017453292519943, system: 'Common', notes: 'angular speed' },
  { id: 'rpm', name: 'revolutions per minute', symbol: 'rpm', plural: 'rpm', category: 'speed', categoryName: 'Speed', baseDimension: BASE_DIMENSIONS.SPEED, multiplier: 0.10471975511966, system: 'Common', notes: 'angular speed' },
  { id: 'rps', name: 'revolutions per second', symbol: 'rps', plural: 'rps', category: 'speed', categoryName: 'Speed', baseDimension: BASE_DIMENSIONS.SPEED, multiplier: 6.2831853071796, system: 'Common', notes: 'angular speed' }
]);

// ============================================================================
// 8. ACCELERATION
// ============================================================================

addUnits([
  { id: 'meter_per_second_squared', name: 'meter per second squared', symbol: 'm/s²', plural: 'meters per second squared', category: 'acceleration', categoryName: 'Acceleration', baseDimension: BASE_DIMENSIONS.ACCELERATION, multiplier: 1, system: 'SI' },
  { id: 'foot_per_second_squared', name: 'foot per second squared', symbol: 'ft/s²', plural: 'feet per second squared', category: 'acceleration', categoryName: 'Acceleration', baseDimension: BASE_DIMENSIONS.ACCELERATION, multiplier: 0.3048, system: 'Imperial' },
  { id: 'gal', name: 'gal', symbol: 'Gal', plural: 'gals', category: 'acceleration', categoryName: 'Acceleration', baseDimension: BASE_DIMENSIONS.ACCELERATION, multiplier: 0.01, system: 'CGS', notes: 'cm/s²' },
  { id: 'standard_gravity', name: 'standard gravity', symbol: 'g', plural: 'g', category: 'acceleration', categoryName: 'Acceleration', baseDimension: BASE_DIMENSIONS.ACCELERATION, multiplier: 9.80665, system: 'SI', notes: 'g ≈ 9.80665 m/s²' }
]);

// ============================================================================
// 9. FORCE
// ============================================================================

addUnits([
  { id: 'newton', name: 'newton', symbol: 'N', plural: 'newtons', category: 'force', categoryName: 'Force', baseDimension: BASE_DIMENSIONS.FORCE, multiplier: 1, system: 'SI' },
  { id: 'kilonewton', name: 'kilonewton', symbol: 'kN', plural: 'kilonewtons', category: 'force', categoryName: 'Force', baseDimension: BASE_DIMENSIONS.FORCE, multiplier: 1000, system: 'SI' },
  { id: 'dyne', name: 'dyne', symbol: 'dyn', plural: 'dynes', category: 'force', categoryName: 'Force', baseDimension: BASE_DIMENSIONS.FORCE, multiplier: 0.00001, system: 'CGS' },
  { id: 'kilogram_force', name: 'kilogram-force', symbol: 'kgf', plural: 'kilogram-force', category: 'force', categoryName: 'Force', baseDimension: BASE_DIMENSIONS.FORCE, multiplier: 9.80665, system: 'Gravitational', notes: 'kilopond' },
  { id: 'pound_force', name: 'pound-force', symbol: 'lbf', plural: 'pound-force', category: 'force', categoryName: 'Force', baseDimension: BASE_DIMENSIONS.FORCE, multiplier: 4.4482216152605, system: 'Imperial' },
  { id: 'poundal', name: 'poundal', symbol: 'pdl', plural: 'poundals', category: 'force', categoryName: 'Force', baseDimension: BASE_DIMENSIONS.FORCE, multiplier: 0.138254954376, system: 'Imperial' }
]);

// ============================================================================
// 10. ENERGY / WORK / HEAT
// ============================================================================

addUnits([
  { id: 'joule', name: 'joule', symbol: 'J', plural: 'joules', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 1, system: 'SI' },
  { id: 'kilojoule', name: 'kilojoule', symbol: 'kJ', plural: 'kilojoules', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 1000, system: 'SI' },
  { id: 'megajoule', name: 'megajoule', symbol: 'MJ', plural: 'megajoules', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 1000000, system: 'SI' },
  { id: 'calorie', name: 'calorie', symbol: 'cal', plural: 'calories', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 4.184, system: 'Thermochemical', notes: 'thermochemical calorie' },
  { id: 'kilocalorie', name: 'kilocalorie', symbol: 'kcal', plural: 'kilocalories', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 4184, system: 'Thermochemical', notes: 'food calorie' },
  { id: 'btu', name: 'British thermal unit', symbol: 'BTU', plural: 'BTU', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 1055.05585262, system: 'Imperial', notes: 'IT BTU' },
  { id: 'watt_hour', name: 'watt-hour', symbol: 'Wh', plural: 'watt-hours', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 3600, system: 'SI' },
  { id: 'kilowatt_hour', name: 'kilowatt-hour', symbol: 'kWh', plural: 'kilowatt-hours', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 3600000, system: 'SI' },
  { id: 'electronvolt', name: 'electronvolt', symbol: 'eV', plural: 'electronvolts', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 1.602176634e-19, system: 'Scientific' },
  { id: 'kiloelectronvolt', name: 'kiloelectronvolt', symbol: 'keV', plural: 'kiloelectronvolts', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 1.602176634e-16, system: 'Scientific' },
  { id: 'megaelectronvolt', name: 'megaelectronvolt', symbol: 'MeV', plural: 'megaelectronvolts', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 1.602176634e-13, system: 'Scientific' },
  { id: 'gigaelectronvolt', name: 'gigaelectronvolt', symbol: 'GeV', plural: 'gigaelectronvolts', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 1.602176634e-10, system: 'Scientific' },
  { id: 'erg', name: 'erg', symbol: 'erg', plural: 'ergs', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 1e-7, system: 'CGS' },
  { id: 'therm', name: 'therm', symbol: 'therm', plural: 'therms', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 105506000, system: 'Imperial', notes: 'US therm' },
  { id: 'ton_tnt', name: 'ton of TNT', symbol: 't TNT', plural: 'tons of TNT', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 4184000000, system: 'Scientific', notes: 'energy equivalent' },
  { id: 'foot_pound_force', name: 'foot-pound-force', symbol: 'ft·lbf', plural: 'foot-pound-force', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 1.3558179483314, system: 'Imperial' },
  { id: 'inch_pound', name: 'inch-pound', symbol: 'in·lb', plural: 'inch-pounds', category: 'energy', categoryName: 'Energy', baseDimension: BASE_DIMENSIONS.ENERGY, multiplier: 0.11298482902762, system: 'Imperial' }
]);

// ============================================================================
// 11. POWER
// ============================================================================

addUnits([
  { id: 'watt', name: 'watt', symbol: 'W', plural: 'watts', category: 'power', categoryName: 'Power', baseDimension: BASE_DIMENSIONS.POWER, multiplier: 1, system: 'SI' },
  { id: 'kilowatt', name: 'kilowatt', symbol: 'kW', plural: 'kilowatts', category: 'power', categoryName: 'Power', baseDimension: BASE_DIMENSIONS.POWER, multiplier: 1000, system: 'SI' },
  { id: 'megawatt', name: 'megawatt', symbol: 'MW', plural: 'megawatts', category: 'power', categoryName: 'Power', baseDimension: BASE_DIMENSIONS.POWER, multiplier: 1000000, system: 'SI' },
  { id: 'gigawatt', name: 'gigawatt', symbol: 'GW', plural: 'gigawatts', category: 'power', categoryName: 'Power', baseDimension: BASE_DIMENSIONS.POWER, multiplier: 1000000000, system: 'SI' },
  { id: 'horsepower_mechanical', name: 'horsepower (mechanical)', symbol: 'hp', plural: 'horsepower', category: 'power', categoryName: 'Power', baseDimension: BASE_DIMENSIONS.POWER, multiplier: 745.69987158227, system: 'Imperial' },
  { id: 'horsepower_metric', name: 'horsepower (metric)', symbol: 'PS', plural: 'horsepower', category: 'power', categoryName: 'Power', baseDimension: BASE_DIMENSIONS.POWER, multiplier: 735.49875, system: 'Metric' },
  { id: 'horsepower_boiler', name: 'horsepower (boiler)', symbol: 'hp', plural: 'horsepower', category: 'power', categoryName: 'Power', baseDimension: BASE_DIMENSIONS.POWER, multiplier: 9809.5, system: 'Imperial', notes: 'boiler hp' },
  { id: 'horsepower_electrical', name: 'horsepower (electrical)', symbol: 'hp', plural: 'horsepower', category: 'power', categoryName: 'Power', baseDimension: BASE_DIMENSIONS.POWER, multiplier: 746, system: 'Imperial', notes: 'electrical hp' },
  { id: 'btu_per_hour', name: 'BTU per hour', symbol: 'BTU/h', plural: 'BTU per hour', category: 'power', categoryName: 'Power', baseDimension: BASE_DIMENSIONS.POWER, multiplier: 0.29307107017222, system: 'Imperial' },
  { id: 'ton_refrigeration', name: 'ton of refrigeration', symbol: 'RT', plural: 'tons of refrigeration', category: 'power', categoryName: 'Power', baseDimension: BASE_DIMENSIONS.POWER, multiplier: 3516.8528420667, system: 'US' }
]);

// ============================================================================
// 12. PRESSURE / STRESS
// ============================================================================

addUnits([
  { id: 'pascal', name: 'pascal', symbol: 'Pa', plural: 'pascals', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 1, system: 'SI' },
  { id: 'kilopascal', name: 'kilopascal', symbol: 'kPa', plural: 'kilopascals', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 1000, system: 'SI' },
  { id: 'megapascal', name: 'megapascal', symbol: 'MPa', plural: 'megapascals', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 1000000, system: 'SI' },
  { id: 'bar', name: 'bar', symbol: 'bar', plural: 'bars', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 100000, system: 'SI' },
  { id: 'millibar', name: 'millibar', symbol: 'mbar', plural: 'millibars', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 100, system: 'SI' },
  { id: 'atmosphere', name: 'atmosphere', symbol: 'atm', plural: 'atmospheres', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 101325, system: 'Standard' },
  { id: 'technical_atmosphere', name: 'technical atmosphere', symbol: 'at', plural: 'technical atmospheres', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 98066.5, system: 'Metric' },
  { id: 'torr', name: 'torr', symbol: 'Torr', plural: 'torr', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 133.32236842105, system: 'Scientific' },
  { id: 'millimeter_mercury', name: 'millimeter of mercury', symbol: 'mmHg', plural: 'millimeters of mercury', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 133.322387415, system: 'Medical' },
  { id: 'inch_mercury', name: 'inch of mercury', symbol: 'inHg', plural: 'inches of mercury', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 3386.389, system: 'Imperial' },
  { id: 'psi', name: 'pound per square inch', symbol: 'psi', plural: 'psi', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 6894.7572931783, system: 'Imperial' },
  { id: 'psf', name: 'pound per square foot', symbol: 'psf', plural: 'psf', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 47.880258980336, system: 'Imperial' },
  { id: 'centimeter_water', name: 'centimeter of water', symbol: 'cmH₂O', plural: 'centimeters of water', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 98.0665, system: 'Medical' },
  { id: 'inch_water', name: 'inch of water', symbol: 'inH₂O', plural: 'inches of water', category: 'pressure', categoryName: 'Pressure', baseDimension: BASE_DIMENSIONS.PRESSURE, multiplier: 249.08891, system: 'Imperial' }
]);

// ============================================================================
// 13. DENSITY / MASS PER VOLUME
// ============================================================================

addUnits([
  { id: 'kilogram_per_cubic_meter', name: 'kilogram per cubic meter', symbol: 'kg/m³', plural: 'kilograms per cubic meter', category: 'density', categoryName: 'Density', baseDimension: BASE_DIMENSIONS.DENSITY, multiplier: 1, system: 'SI' },
  { id: 'gram_per_cubic_centimeter', name: 'gram per cubic centimeter', symbol: 'g/cm³', plural: 'grams per cubic centimeter', category: 'density', categoryName: 'Density', baseDimension: BASE_DIMENSIONS.DENSITY, multiplier: 1000, system: 'SI' },
  { id: 'gram_per_liter', name: 'gram per liter', symbol: 'g/L', plural: 'grams per liter', category: 'density', categoryName: 'Density', baseDimension: BASE_DIMENSIONS.DENSITY, multiplier: 1, system: 'SI' },
  { id: 'milligram_per_milliliter', name: 'milligram per milliliter', symbol: 'mg/mL', plural: 'milligrams per milliliter', category: 'density', categoryName: 'Density', baseDimension: BASE_DIMENSIONS.DENSITY, multiplier: 1, system: 'SI' },
  { id: 'pound_per_cubic_foot', name: 'pound per cubic foot', symbol: 'lb/ft³', plural: 'pounds per cubic foot', category: 'density', categoryName: 'Density', baseDimension: BASE_DIMENSIONS.DENSITY, multiplier: 16.01846337396, system: 'Imperial' },
  { id: 'pound_per_gallon_us', name: 'pound per gallon (US)', symbol: 'lb/US gal', plural: 'pounds per gallon', category: 'density', categoryName: 'Density', baseDimension: BASE_DIMENSIONS.DENSITY, multiplier: 119.8264273169, system: 'US' },
  { id: 'pound_per_gallon_uk', name: 'pound per gallon (UK)', symbol: 'lb/imp gal', plural: 'pounds per gallon', category: 'density', categoryName: 'Density', baseDimension: BASE_DIMENSIONS.DENSITY, multiplier: 99.776372663102, system: 'Imperial' },
  { id: 'specific_gravity', name: 'specific gravity', symbol: 'SG', plural: 'specific gravity', category: 'density', categoryName: 'Density', baseDimension: BASE_DIMENSIONS.DENSITY, multiplier: 1000, system: 'Dimensionless', notes: 'relative to water' }
]);

// ============================================================================
// 14. FLOW RATE
// ============================================================================

addUnits([
  // Volume flow
  { id: 'cubic_meter_per_second', name: 'cubic meter per second', symbol: 'm³/s', plural: 'cubic meters per second', category: 'flow_rate', categoryName: 'Flow Rate', baseDimension: BASE_DIMENSIONS.FLOW_RATE_VOLUME, multiplier: 1, system: 'SI' },
  { id: 'cubic_meter_per_hour', name: 'cubic meter per hour', symbol: 'm³/h', plural: 'cubic meters per hour', category: 'flow_rate', categoryName: 'Flow Rate', baseDimension: BASE_DIMENSIONS.FLOW_RATE_VOLUME, multiplier: 0.00027777777777778, system: 'SI' },
  { id: 'liter_per_second', name: 'liter per second', symbol: 'L/s', plural: 'liters per second', category: 'flow_rate', categoryName: 'Flow Rate', baseDimension: BASE_DIMENSIONS.FLOW_RATE_VOLUME, multiplier: 0.001, system: 'SI' },
  { id: 'liter_per_minute', name: 'liter per minute', symbol: 'L/min', plural: 'liters per minute', category: 'flow_rate', categoryName: 'Flow Rate', baseDimension: BASE_DIMENSIONS.FLOW_RATE_VOLUME, multiplier: 0.000016666666666667, system: 'SI' },
  { id: 'gallon_per_minute_us', name: 'gallon per minute (US)', symbol: 'GPM', plural: 'gallons per minute', category: 'flow_rate', categoryName: 'Flow Rate', baseDimension: BASE_DIMENSIONS.FLOW_RATE_VOLUME, multiplier: 0.0000630901964, system: 'US' },
  { id: 'gallon_per_hour_us', name: 'gallon per hour (US)', symbol: 'gal/h', plural: 'gallons per hour', category: 'flow_rate', categoryName: 'Flow Rate', baseDimension: BASE_DIMENSIONS.FLOW_RATE_VOLUME, multiplier: 0.0000010515032733, system: 'US' },
  { id: 'cubic_foot_per_second', name: 'cubic foot per second', symbol: 'cfs', plural: 'cubic feet per second', category: 'flow_rate', categoryName: 'Flow Rate', baseDimension: BASE_DIMENSIONS.FLOW_RATE_VOLUME, multiplier: 0.028316846592, system: 'US' },
  { id: 'cubic_foot_per_minute', name: 'cubic foot per minute', symbol: 'cfm', plural: 'cubic feet per minute', category: 'flow_rate', categoryName: 'Flow Rate', baseDimension: BASE_DIMENSIONS.FLOW_RATE_VOLUME, multiplier: 0.0004719474432, system: 'US' },
  
  // Mass flow
  { id: 'kilogram_per_second', name: 'kilogram per second', symbol: 'kg/s', plural: 'kilograms per second', category: 'flow_rate', categoryName: 'Flow Rate', baseDimension: BASE_DIMENSIONS.FLOW_RATE_MASS, multiplier: 1, system: 'SI' },
  { id: 'kilogram_per_hour', name: 'kilogram per hour', symbol: 'kg/h', plural: 'kilograms per hour', category: 'flow_rate', categoryName: 'Flow Rate', baseDimension: BASE_DIMENSIONS.FLOW_RATE_MASS, multiplier: 0.00027777777777778, system: 'SI' },
  { id: 'pound_per_second', name: 'pound per second', symbol: 'lb/s', plural: 'pounds per second', category: 'flow_rate', categoryName: 'Flow Rate', baseDimension: BASE_DIMENSIONS.FLOW_RATE_MASS, multiplier: 0.45359237, system: 'Imperial' },
  { id: 'pound_per_hour', name: 'pound per hour', symbol: 'lb/h', plural: 'pounds per hour', category: 'flow_rate', categoryName: 'Flow Rate', baseDimension: BASE_DIMENSIONS.FLOW_RATE_MASS, multiplier: 0.00012599788055556, system: 'Imperial' }
]);

// ============================================================================
// 15. ANGLE / PLANE ANGLE
// ============================================================================

addUnits([
  { id: 'radian', name: 'radian', symbol: 'rad', plural: 'radians', category: 'angle', categoryName: 'Angle', baseDimension: BASE_DIMENSIONS.ANGLE, multiplier: 1, system: 'SI' },
  { id: 'degree', name: 'degree', symbol: '°', plural: 'degrees', category: 'angle', categoryName: 'Angle', baseDimension: BASE_DIMENSIONS.ANGLE, multiplier: 0.017453292519943, system: 'Common' },
  { id: 'minute_arc', name: 'minute of arc', symbol: '′', plural: 'minutes of arc', category: 'angle', categoryName: 'Angle', baseDimension: BASE_DIMENSIONS.ANGLE, multiplier: 0.00029088820866572, system: 'Common' },
  { id: 'second_arc', name: 'second of arc', symbol: '″', plural: 'seconds of arc', category: 'angle', categoryName: 'Angle', baseDimension: BASE_DIMENSIONS.ANGLE, multiplier: 0.0000048481368110954, system: 'Common' },
  { id: 'gradian', name: 'gradian', symbol: 'gon', plural: 'gradians', category: 'angle', categoryName: 'Angle', baseDimension: BASE_DIMENSIONS.ANGLE, multiplier: 0.015707963267949, system: 'Metric' },
  { id: 'turn', name: 'turn', symbol: 'rev', plural: 'turns', category: 'angle', categoryName: 'Angle', baseDimension: BASE_DIMENSIONS.ANGLE, multiplier: 6.2831853071796, system: 'Common', notes: 'revolution (2π rad)' },
  { id: 'milliradian', name: 'milliradian', symbol: 'mrad', plural: 'milliradians', category: 'angle', categoryName: 'Angle', baseDimension: BASE_DIMENSIONS.ANGLE, multiplier: 0.001, system: 'SI' }
]);

// ============================================================================
// 16. SOLID ANGLE
// ============================================================================

addUnits([
  { id: 'steradian', name: 'steradian', symbol: 'sr', plural: 'steradians', category: 'solid_angle', categoryName: 'Solid Angle', baseDimension: BASE_DIMENSIONS.SOLID_ANGLE, multiplier: 1, system: 'SI' },
  { id: 'square_degree', name: 'square degree', symbol: 'deg²', plural: 'square degrees', category: 'solid_angle', categoryName: 'Solid Angle', baseDimension: BASE_DIMENSIONS.SOLID_ANGLE, multiplier: 0.00030461741978671, system: 'Common' },
  { id: 'square_arcminute', name: 'square arcminute', symbol: 'arcmin²', plural: 'square arcminutes', category: 'solid_angle', categoryName: 'Solid Angle', baseDimension: BASE_DIMENSIONS.SOLID_ANGLE, multiplier: 0.000000084615949940753, system: 'Common' },
  { id: 'square_arcsecond', name: 'square arcsecond', symbol: 'arcsec²', plural: 'square arcseconds', category: 'solid_angle', categoryName: 'Solid Angle', baseDimension: BASE_DIMENSIONS.SOLID_ANGLE, multiplier: 0.000000000023504430539098, system: 'Common' }
]);

// ============================================================================
// 17. FREQUENCY / PERIOD
// ============================================================================

addUnits([
  { id: 'hertz', name: 'hertz', symbol: 'Hz', plural: 'hertz', category: 'frequency', categoryName: 'Frequency', baseDimension: BASE_DIMENSIONS.FREQUENCY, multiplier: 1, system: 'SI' },
  { id: 'kilohertz', name: 'kilohertz', symbol: 'kHz', plural: 'kilohertz', category: 'frequency', categoryName: 'Frequency', baseDimension: BASE_DIMENSIONS.FREQUENCY, multiplier: 1000, system: 'SI' },
  { id: 'megahertz', name: 'megahertz', symbol: 'MHz', plural: 'megahertz', category: 'frequency', categoryName: 'Frequency', baseDimension: BASE_DIMENSIONS.FREQUENCY, multiplier: 1000000, system: 'SI' },
  { id: 'gigahertz', name: 'gigahertz', symbol: 'GHz', plural: 'gigahertz', category: 'frequency', categoryName: 'Frequency', baseDimension: BASE_DIMENSIONS.FREQUENCY, multiplier: 1000000000, system: 'SI' },
  { id: 'rpm_freq', name: 'revolutions per minute', symbol: 'rpm', plural: 'rpm', category: 'frequency', categoryName: 'Frequency', baseDimension: BASE_DIMENSIONS.FREQUENCY, multiplier: 0.016666666666667, system: 'Common' },
  { id: 'bpm', name: 'beats per minute', symbol: 'BPM', plural: 'BPM', category: 'frequency', categoryName: 'Frequency', baseDimension: BASE_DIMENSIONS.FREQUENCY, multiplier: 0.016666666666667, system: 'Common' },
  { id: 'cps', name: 'cycles per second', symbol: 'cps', plural: 'cps', category: 'frequency', categoryName: 'Frequency', baseDimension: BASE_DIMENSIONS.FREQUENCY, multiplier: 1, system: 'Common', notes: 'same as Hz' }
]);

// ============================================================================
// 18-24. ELECTRICAL UNITS
// ============================================================================

addUnits([
  // Electric Current
  { id: 'ampere', name: 'ampere', symbol: 'A', plural: 'amperes', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CURRENT, multiplier: 1, system: 'SI' },
  { id: 'milliampere', name: 'milliampere', symbol: 'mA', plural: 'milliamperes', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CURRENT, multiplier: 0.001, system: 'SI' },
  { id: 'microampere', name: 'microampere', symbol: 'µA', plural: 'microamperes', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CURRENT, multiplier: 1e-6, system: 'SI' },
  { id: 'kiloampere', name: 'kiloampere', symbol: 'kA', plural: 'kiloamperes', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CURRENT, multiplier: 1000, system: 'SI' },
  
  // Electric Charge
  { id: 'coulomb', name: 'coulomb', symbol: 'C', plural: 'coulombs', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CHARGE, multiplier: 1, system: 'SI' },
  { id: 'ampere_hour', name: 'ampere-hour', symbol: 'Ah', plural: 'ampere-hours', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CHARGE, multiplier: 3600, system: 'SI' },
  { id: 'milliampere_hour', name: 'milliampere-hour', symbol: 'mAh', plural: 'milliampere-hours', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CHARGE, multiplier: 3.6, system: 'SI' },
  { id: 'faraday', name: 'faraday', symbol: 'F', plural: 'faradays', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CHARGE, multiplier: 96485.332123310018, system: 'Scientific', notes: 'of charge' },
  { id: 'elementary_charge', name: 'elementary charge', symbol: 'e', plural: 'elementary charges', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CHARGE, multiplier: 1.602176634e-19, system: 'Scientific' },
  { id: 'statcoulomb', name: 'statcoulomb', symbol: 'statC', plural: 'statcoulombs', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CHARGE, multiplier: 3.3356409519815205e-10, system: 'CGS', notes: 'esu' },
  
  // Voltage / Electric Potential
  { id: 'volt', name: 'volt', symbol: 'V', plural: 'volts', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.VOLTAGE, multiplier: 1, system: 'SI' },
  { id: 'millivolt', name: 'millivolt', symbol: 'mV', plural: 'millivolts', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.VOLTAGE, multiplier: 0.001, system: 'SI' },
  { id: 'kilovolt', name: 'kilovolt', symbol: 'kV', plural: 'kilovolts', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.VOLTAGE, multiplier: 1000, system: 'SI' },
  { id: 'statvolt', name: 'statvolt', symbol: 'statV', plural: 'statvolts', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.VOLTAGE, multiplier: 299.792458, system: 'CGS' },
  
  // Electrical Resistance
  { id: 'ohm', name: 'ohm', symbol: 'Ω', plural: 'ohms', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.RESISTANCE, multiplier: 1, system: 'SI' },
  { id: 'milliohm', name: 'milliohm', symbol: 'mΩ', plural: 'milliohms', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.RESISTANCE, multiplier: 0.001, system: 'SI' },
  { id: 'kiloohm', name: 'kiloohm', symbol: 'kΩ', plural: 'kiloohms', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.RESISTANCE, multiplier: 1000, system: 'SI' },
  { id: 'megaohm', name: 'megaohm', symbol: 'MΩ', plural: 'megaohms', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.RESISTANCE, multiplier: 1000000, system: 'SI' },
  { id: 'statohm', name: 'statohm', symbol: 'statΩ', plural: 'statohms', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.RESISTANCE, multiplier: 8.9875517873681764e11, system: 'CGS' },
  
  // Conductance
  { id: 'siemens', name: 'siemens', symbol: 'S', plural: 'siemens', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CONDUCTANCE, multiplier: 1, system: 'SI' },
  { id: 'mho', name: 'mho', symbol: '℧', plural: 'mhos', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CONDUCTANCE, multiplier: 1, system: 'Historical', notes: 'same as siemens' },
  
  // Capacitance
  { id: 'farad', name: 'farad', symbol: 'F', plural: 'farads', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CAPACITANCE, multiplier: 1, system: 'SI' },
  { id: 'microfarad', name: 'microfarad', symbol: 'µF', plural: 'microfarads', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CAPACITANCE, multiplier: 1e-6, system: 'SI' },
  { id: 'nanofarad', name: 'nanofarad', symbol: 'nF', plural: 'nanofarads', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CAPACITANCE, multiplier: 1e-9, system: 'SI' },
  { id: 'picofarad', name: 'picofarad', symbol: 'pF', plural: 'picofarads', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CAPACITANCE, multiplier: 1e-12, system: 'SI' },
  { id: 'statfarad', name: 'statfarad', symbol: 'statF', plural: 'statfarads', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.CAPACITANCE, multiplier: 1.1126500560536184e-12, system: 'CGS' },
  
  // Inductance
  { id: 'henry', name: 'henry', symbol: 'H', plural: 'henries', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.INDUCTANCE, multiplier: 1, system: 'SI' },
  { id: 'millihenry', name: 'millihenry', symbol: 'mH', plural: 'millihenries', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.INDUCTANCE, multiplier: 0.001, system: 'SI' },
  { id: 'microhenry', name: 'microhenry', symbol: 'µH', plural: 'microhenries', category: 'electrical', categoryName: 'Electrical', baseDimension: BASE_DIMENSIONS.INDUCTANCE, multiplier: 1e-6, system: 'SI' }
]);

// ============================================================================
// 25-26. MAGNETIC UNITS
// ============================================================================

addUnits([
  // Magnetic Flux
  { id: 'weber', name: 'weber', symbol: 'Wb', plural: 'webers', category: 'magnetic', categoryName: 'Magnetic', baseDimension: BASE_DIMENSIONS.MAGNETIC_FLUX, multiplier: 1, system: 'SI' },
  { id: 'maxwell', name: 'maxwell', symbol: 'Mx', plural: 'maxwells', category: 'magnetic', categoryName: 'Magnetic', baseDimension: BASE_DIMENSIONS.MAGNETIC_FLUX, multiplier: 1e-8, system: 'CGS' },
  
  // Magnetic Flux Density
  { id: 'tesla', name: 'tesla', symbol: 'T', plural: 'teslas', category: 'magnetic', categoryName: 'Magnetic', baseDimension: BASE_DIMENSIONS.MAGNETIC_FLUX_DENSITY, multiplier: 1, system: 'SI' },
  { id: 'gauss', name: 'gauss', symbol: 'G', plural: 'gauss', category: 'magnetic', categoryName: 'Magnetic', baseDimension: BASE_DIMENSIONS.MAGNETIC_FLUX_DENSITY, multiplier: 0.0001, system: 'CGS' }
]);

// ============================================================================
// 27. LUMINANCE / PHOTOMETRY
// ============================================================================

addUnits([
  // Luminous Intensity
  { id: 'candela', name: 'candela', symbol: 'cd', plural: 'candela', category: 'photometry', categoryName: 'Photometry', baseDimension: BASE_DIMENSIONS.LUMINOUS_INTENSITY, multiplier: 1, system: 'SI' },
  
  // Luminous Flux
  { id: 'lumen', name: 'lumen', symbol: 'lm', plural: 'lumens', category: 'photometry', categoryName: 'Photometry', baseDimension: BASE_DIMENSIONS.LUMINOUS_FLUX, multiplier: 1, system: 'SI' },
  
  // Illuminance
  { id: 'lux', name: 'lux', symbol: 'lx', plural: 'lux', category: 'photometry', categoryName: 'Photometry', baseDimension: BASE_DIMENSIONS.ILLUMINANCE, multiplier: 1, system: 'SI' },
  { id: 'phot', name: 'phot', symbol: 'ph', plural: 'phots', category: 'photometry', categoryName: 'Photometry', baseDimension: BASE_DIMENSIONS.ILLUMINANCE, multiplier: 10000, system: 'CGS' },
  { id: 'foot_candle', name: 'foot-candle', symbol: 'fc', plural: 'foot-candles', category: 'photometry', categoryName: 'Photometry', baseDimension: BASE_DIMENSIONS.ILLUMINANCE, multiplier: 10.76391041671, system: 'Imperial' },
  
  // Luminance
  { id: 'candela_per_square_meter', name: 'candela per square meter', symbol: 'cd/m²', plural: 'candela per square meter', category: 'photometry', categoryName: 'Photometry', baseDimension: BASE_DIMENSIONS.LUMINANCE, multiplier: 1, system: 'SI' },
  { id: 'nit', name: 'nit', symbol: 'nt', plural: 'nits', category: 'photometry', categoryName: 'Photometry', baseDimension: BASE_DIMENSIONS.LUMINANCE, multiplier: 1, system: 'SI', notes: 'same as cd/m²' },
  { id: 'stilb', name: 'stilb', symbol: 'sb', plural: 'stilbs', category: 'photometry', categoryName: 'Photometry', baseDimension: BASE_DIMENSIONS.LUMINANCE, multiplier: 10000, system: 'CGS' },
  { id: 'lambert', name: 'lambert', symbol: 'L', plural: 'lamberts', category: 'photometry', categoryName: 'Photometry', baseDimension: BASE_DIMENSIONS.LUMINANCE, multiplier: 3183.0988618379, system: 'CGS' },
  { id: 'foot_lambert', name: 'foot-lambert', symbol: 'fL', plural: 'foot-lamberts', category: 'photometry', categoryName: 'Photometry', baseDimension: BASE_DIMENSIONS.LUMINANCE, multiplier: 3.4262590996354, system: 'Imperial' }
]);

// ============================================================================
// 28. RADIOACTIVITY / RADIATION
// ============================================================================

addUnits([
  // Activity
  { id: 'becquerel', name: 'becquerel', symbol: 'Bq', plural: 'becquerels', category: 'radiation', categoryName: 'Radiation', baseDimension: BASE_DIMENSIONS.RADIOACTIVITY, multiplier: 1, system: 'SI' },
  { id: 'curie', name: 'curie', symbol: 'Ci', plural: 'curies', category: 'radiation', categoryName: 'Radiation', baseDimension: BASE_DIMENSIONS.RADIOACTIVITY, multiplier: 37000000000, system: 'CGS' },
  
  // Absorbed Dose
  { id: 'gray', name: 'gray', symbol: 'Gy', plural: 'grays', category: 'radiation', categoryName: 'Radiation', baseDimension: BASE_DIMENSIONS.ABSORBED_DOSE, multiplier: 1, system: 'SI' },
  { id: 'rad', name: 'rad', symbol: 'rad', plural: 'rads', category: 'radiation', categoryName: 'Radiation', baseDimension: BASE_DIMENSIONS.ABSORBED_DOSE, multiplier: 0.01, system: 'CGS' },
  
  // Dose Equivalent
  { id: 'sievert', name: 'sievert', symbol: 'Sv', plural: 'sieverts', category: 'radiation', categoryName: 'Radiation', baseDimension: BASE_DIMENSIONS.DOSE_EQUIVALENT, multiplier: 1, system: 'SI' },
  { id: 'rem', name: 'rem', symbol: 'rem', plural: 'rems', category: 'radiation', categoryName: 'Radiation', baseDimension: BASE_DIMENSIONS.DOSE_EQUIVALENT, multiplier: 0.01, system: 'CGS' },
  { id: 'roentgen', name: 'roentgen', symbol: 'R', plural: 'roentgens', category: 'radiation', categoryName: 'Radiation', baseDimension: BASE_DIMENSIONS.DOSE_EQUIVALENT, multiplier: 0.00877, system: 'CGS', notes: 'exposure' }
]);

// ============================================================================
// 29-30. DATA / INFORMATION
// ============================================================================

addUnits([
  // Data (distinguishing decimal vs binary)
  { id: 'bit', name: 'bit', symbol: 'b', plural: 'bits', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 1, system: 'Digital' },
  { id: 'byte', name: 'byte', symbol: 'B', plural: 'bytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 8, system: 'Digital' },
  
  // Decimal (SI prefixes)
  { id: 'kilobit', name: 'kilobit', symbol: 'kbit', plural: 'kilobits', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 1000, system: 'Digital', notes: 'decimal (10³)' },
  { id: 'megabit', name: 'megabit', symbol: 'Mbit', plural: 'megabits', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 1000000, system: 'Digital', notes: 'decimal (10⁶)' },
  { id: 'gigabit', name: 'gigabit', symbol: 'Gbit', plural: 'gigabits', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 1000000000, system: 'Digital', notes: 'decimal (10⁹)' },
  { id: 'terabit', name: 'terabit', symbol: 'Tbit', plural: 'terabits', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 1000000000000, system: 'Digital', notes: 'decimal (10¹²)' },
  { id: 'kilobyte', name: 'kilobyte', symbol: 'kB', plural: 'kilobytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 8000, system: 'Digital', notes: 'decimal (10³ B)' },
  { id: 'megabyte', name: 'megabyte', symbol: 'MB', plural: 'megabytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 8000000, system: 'Digital', notes: 'decimal (10⁶ B)' },
  { id: 'gigabyte', name: 'gigabyte', symbol: 'GB', plural: 'gigabytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 8000000000, system: 'Digital', notes: 'decimal (10⁹ B)' },
  { id: 'terabyte', name: 'terabyte', symbol: 'TB', plural: 'terabytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 8000000000000, system: 'Digital', notes: 'decimal (10¹² B)' },
  { id: 'petabyte', name: 'petabyte', symbol: 'PB', plural: 'petabytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 8000000000000000, system: 'Digital', notes: 'decimal (10¹⁵ B)' },
  { id: 'exabyte', name: 'exabyte', symbol: 'EB', plural: 'exabytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 8000000000000000000, system: 'Digital', notes: 'decimal (10¹⁸ B)' },
  
  // Binary (IEC prefixes)
  { id: 'kibibit', name: 'kibibit', symbol: 'Kibit', plural: 'kibibits', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 1024, system: 'Digital', notes: 'binary (2¹⁰)' },
  { id: 'mebibit', name: 'mebibit', symbol: 'Mibit', plural: 'mebibits', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 1048576, system: 'Digital', notes: 'binary (2²⁰)' },
  { id: 'gibibit', name: 'gibibit', symbol: 'Gibit', plural: 'gibibits', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 1073741824, system: 'Digital', notes: 'binary (2³⁰)' },
  { id: 'tebibit', name: 'tebibit', symbol: 'Tibit', plural: 'tebibits', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 1099511627776, system: 'Digital', notes: 'binary (2⁴⁰)' },
  { id: 'kibibyte', name: 'kibibyte', symbol: 'KiB', plural: 'kibibytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 8192, system: 'Digital', notes: 'binary (2¹⁰ B)' },
  { id: 'mebibyte', name: 'mebibyte', symbol: 'MiB', plural: 'mebibytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 8388608, system: 'Digital', notes: 'binary (2²⁰ B)' },
  { id: 'gibibyte', name: 'gibibyte', symbol: 'GiB', plural: 'gibibytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 8589934592, system: 'Digital', notes: 'binary (2³⁰ B)' },
  { id: 'tebibyte', name: 'tebibyte', symbol: 'TiB', plural: 'tebibytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 8796093022208, system: 'Digital', notes: 'binary (2⁴⁰ B)' },
  { id: 'pebibyte', name: 'pebibyte', symbol: 'PiB', plural: 'pebibytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 9007199254740992, system: 'Digital', notes: 'binary (2⁵⁰ B)' },
  { id: 'exbibyte', name: 'exbibyte', symbol: 'EiB', plural: 'exbibytes', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA, multiplier: 9223372036854775808, system: 'Digital', notes: 'binary (2⁶⁰ B)' },
  { id: 'baud', name: 'baud', symbol: 'Bd', plural: 'baud', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA_RATE, multiplier: 1, system: 'Digital', notes: 'for rate, not exactly same as bits/s' },
  
  // Data Transfer Rate
  { id: 'bit_per_second', name: 'bit per second', symbol: 'bit/s', plural: 'bits per second', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA_RATE, multiplier: 1, system: 'Digital' },
  { id: 'kilobit_per_second', name: 'kilobit per second', symbol: 'kbit/s', plural: 'kilobits per second', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA_RATE, multiplier: 1000, system: 'Digital' },
  { id: 'megabit_per_second', name: 'megabit per second', symbol: 'Mbit/s', plural: 'megabits per second', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA_RATE, multiplier: 1000000, system: 'Digital' },
  { id: 'gigabit_per_second', name: 'gigabit per second', symbol: 'Gbit/s', plural: 'gigabits per second', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA_RATE, multiplier: 1000000000, system: 'Digital' },
  { id: 'byte_per_second', name: 'byte per second', symbol: 'B/s', plural: 'bytes per second', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA_RATE, multiplier: 8, system: 'Digital' },
  { id: 'megabyte_per_second', name: 'megabyte per second', symbol: 'MB/s', plural: 'megabytes per second', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA_RATE, multiplier: 8000000, system: 'Digital' },
  { id: 'gigabyte_per_second', name: 'gigabyte per second', symbol: 'GB/s', plural: 'gigabytes per second', category: 'data', categoryName: 'Data', baseDimension: BASE_DIMENSIONS.DATA_RATE, multiplier: 8000000000, system: 'Digital' }
]);

// ============================================================================
// 32. FUEL CONSUMPTION / EFFICIENCY
// ============================================================================

addUnits([
  { id: 'liter_per_100km', name: 'liters per 100 kilometers', symbol: 'L/100 km', plural: 'liters per 100 km', category: 'fuel', categoryName: 'Fuel Consumption', baseDimension: BASE_DIMENSIONS.FUEL_CONSUMPTION, multiplier: 1, system: 'Metric', notes: 'lower is better' },
  { id: 'kilometer_per_liter', name: 'kilometers per liter', symbol: 'km/L', plural: 'kilometers per liter', category: 'fuel', categoryName: 'Fuel Consumption', baseDimension: BASE_DIMENSIONS.FUEL_CONSUMPTION, multiplier: 0.01, system: 'Metric', notes: 'higher is better' },
  { id: 'mile_per_gallon_us', name: 'miles per gallon (US)', symbol: 'mpg', plural: 'mpg', category: 'fuel', categoryName: 'Fuel Consumption', baseDimension: BASE_DIMENSIONS.FUEL_CONSUMPTION, multiplier: 0.425143707, system: 'US', notes: 'higher is better' },
  { id: 'mile_per_gallon_uk', name: 'miles per gallon (UK)', symbol: 'mpg', plural: 'mpg', category: 'fuel', categoryName: 'Fuel Consumption', baseDimension: BASE_DIMENSIONS.FUEL_CONSUMPTION, multiplier: 0.354006, system: 'Imperial', notes: 'higher is better' },
  { id: 'gallon_per_100miles_us', name: 'gallons per 100 miles (US)', symbol: 'gal/100 mi', plural: 'gallons per 100 miles', category: 'fuel', categoryName: 'Fuel Consumption', baseDimension: BASE_DIMENSIONS.FUEL_CONSUMPTION, multiplier: 2.352145833, system: 'US', notes: 'lower is better' },
  { id: 'gallon_per_100miles_uk', name: 'gallons per 100 miles (UK)', symbol: 'imp gal/100 mi', plural: 'gallons per 100 miles', category: 'fuel', categoryName: 'Fuel Consumption', baseDimension: BASE_DIMENSIONS.FUEL_CONSUMPTION, multiplier: 2.824809363, system: 'Imperial', notes: 'lower is better' }
]);

// ============================================================================
// 33. TORQUE
// ============================================================================

addUnits([
  { id: 'newton_meter', name: 'newton meter', symbol: 'N·m', plural: 'newton meters', category: 'torque', categoryName: 'Torque', baseDimension: BASE_DIMENSIONS.TORQUE, multiplier: 1, system: 'SI' },
  { id: 'pound_foot', name: 'pound-foot', symbol: 'lb·ft', plural: 'pound-feet', category: 'torque', categoryName: 'Torque', baseDimension: BASE_DIMENSIONS.TORQUE, multiplier: 1.3558179483314, system: 'Imperial' },
  { id: 'kilogram_force_meter', name: 'kilogram-force meter', symbol: 'kgf·m', plural: 'kilogram-force meters', category: 'torque', categoryName: 'Torque', baseDimension: BASE_DIMENSIONS.TORQUE, multiplier: 9.80665, system: 'Gravitational' }
]);

// ============================================================================
// 34. VISCOSITY
// ============================================================================

addUnits([
  // Dynamic viscosity
  { id: 'pascal_second', name: 'pascal second', symbol: 'Pa·s', plural: 'pascal seconds', category: 'viscosity', categoryName: 'Viscosity', baseDimension: BASE_DIMENSIONS.VISCOSITY_DYNAMIC, multiplier: 1, system: 'SI' },
  { id: 'poise', name: 'poise', symbol: 'P', plural: 'poise', category: 'viscosity', categoryName: 'Viscosity', baseDimension: BASE_DIMENSIONS.VISCOSITY_DYNAMIC, multiplier: 0.1, system: 'CGS' },
  { id: 'centipoise', name: 'centipoise', symbol: 'cP', plural: 'centipoise', category: 'viscosity', categoryName: 'Viscosity', baseDimension: BASE_DIMENSIONS.VISCOSITY_DYNAMIC, multiplier: 0.001, system: 'CGS' },
  
  // Kinematic viscosity
  { id: 'square_meter_per_second_kinematic', name: 'square meter per second', symbol: 'm²/s', plural: 'square meters per second', category: 'viscosity', categoryName: 'Viscosity', baseDimension: BASE_DIMENSIONS.VISCOSITY_KINEMATIC, multiplier: 1, system: 'SI', notes: 'kinematic viscosity' },
  { id: 'stokes', name: 'stokes', symbol: 'St', plural: 'stokes', category: 'viscosity', categoryName: 'Viscosity', baseDimension: BASE_DIMENSIONS.VISCOSITY_KINEMATIC, multiplier: 0.0001, system: 'CGS' },
  { id: 'centistokes', name: 'centistokes', symbol: 'cSt', plural: 'centistokes', category: 'viscosity', categoryName: 'Viscosity', baseDimension: BASE_DIMENSIONS.VISCOSITY_KINEMATIC, multiplier: 0.000001, system: 'CGS' }
]);

// ============================================================================
// 35. SURFACE TENSION
// ============================================================================

addUnits([
  { id: 'newton_per_meter', name: 'newton per meter', symbol: 'N/m', plural: 'newtons per meter', category: 'thermal', categoryName: 'Thermal Properties', baseDimension: BASE_DIMENSIONS.SURFACE_TENSION, multiplier: 1, system: 'SI' },
  { id: 'dyne_per_centimeter', name: 'dyne per centimeter', symbol: 'dyn/cm', plural: 'dynes per centimeter', category: 'thermal', categoryName: 'Thermal Properties', baseDimension: BASE_DIMENSIONS.SURFACE_TENSION, multiplier: 0.001, system: 'CGS' }
]);

// ============================================================================
// 36. HEAT TRANSFER / THERMAL
// ============================================================================

addUnits([
  // Thermal Conductivity
  { id: 'watt_per_meter_kelvin', name: 'watt per meter kelvin', symbol: 'W/(m·K)', plural: 'watts per meter kelvin', category: 'thermal', categoryName: 'Thermal Properties', baseDimension: BASE_DIMENSIONS.THERMAL_CONDUCTIVITY, multiplier: 1, system: 'SI' },
  { id: 'btu_per_hour_foot_fahrenheit', name: 'BTU per hour foot Fahrenheit', symbol: 'BTU/(hr·ft·°F)', plural: 'BTU per hour foot Fahrenheit', category: 'thermal', categoryName: 'Thermal Properties', baseDimension: BASE_DIMENSIONS.THERMAL_CONDUCTIVITY, multiplier: 1.7307346663714, system: 'Imperial' },
  
  // Thermal Resistance
  { id: 'square_meter_kelvin_per_watt', name: 'square meter kelvin per watt', symbol: '(m²·K)/W', plural: 'square meter kelvin per watt', category: 'thermal', categoryName: 'Thermal Properties', baseDimension: BASE_DIMENSIONS.THERMAL_RESISTANCE, multiplier: 1, system: 'SI' },
  { id: 'square_foot_fahrenheit_hour_per_btu', name: 'square foot Fahrenheit hour per BTU', symbol: '(ft²·°F·hr)/BTU', plural: 'square foot Fahrenheit hour per BTU', category: 'thermal', categoryName: 'Thermal Properties', baseDimension: BASE_DIMENSIONS.THERMAL_RESISTANCE, multiplier: 0.17611018368231, system: 'Imperial' },
  
  // Specific Heat Capacity
  { id: 'joule_per_kilogram_kelvin', name: 'joule per kilogram kelvin', symbol: 'J/(kg·K)', plural: 'joules per kilogram kelvin', category: 'thermal', categoryName: 'Thermal Properties', baseDimension: BASE_DIMENSIONS.SPECIFIC_HEAT, multiplier: 1, system: 'SI' },
  { id: 'calorie_per_gram_celsius', name: 'calorie per gram Celsius', symbol: 'cal/(g·°C)', plural: 'calories per gram Celsius', category: 'thermal', categoryName: 'Thermal Properties', baseDimension: BASE_DIMENSIONS.SPECIFIC_HEAT, multiplier: 4184, system: 'Thermochemical' },
  { id: 'btu_per_pound_fahrenheit', name: 'BTU per pound Fahrenheit', symbol: 'BTU/(lb·°F)', plural: 'BTU per pound Fahrenheit', category: 'thermal', categoryName: 'Thermal Properties', baseDimension: BASE_DIMENSIONS.SPECIFIC_HEAT, multiplier: 4186.8, system: 'Imperial' }
]);

// ============================================================================
// 37. CONCENTRATION
// ============================================================================

addUnits([
  // Mass Concentration
  { id: 'milligram_per_liter', name: 'milligram per liter', symbol: 'mg/L', plural: 'milligrams per liter', category: 'concentration', categoryName: 'Concentration', baseDimension: BASE_DIMENSIONS.CONCENTRATION_MASS, multiplier: 1, system: 'SI' },
  { id: 'gram_per_liter_conc', name: 'gram per liter', symbol: 'g/L', plural: 'grams per liter', category: 'concentration', categoryName: 'Concentration', baseDimension: BASE_DIMENSIONS.CONCENTRATION_MASS, multiplier: 1000, system: 'SI' },
  { id: 'microgram_per_milliliter', name: 'microgram per milliliter', symbol: 'µg/mL', plural: 'micrograms per milliliter', category: 'concentration', categoryName: 'Concentration', baseDimension: BASE_DIMENSIONS.CONCENTRATION_MASS, multiplier: 1, system: 'SI' },
  
  // Molarity
  { id: 'mole_per_liter', name: 'mole per liter', symbol: 'mol/L', plural: 'moles per liter', category: 'concentration', categoryName: 'Concentration', baseDimension: BASE_DIMENSIONS.CONCENTRATION_MOLAR, multiplier: 1, system: 'SI', notes: 'M (molarity)' },
  { id: 'millimole_per_liter', name: 'millimole per liter', symbol: 'mmol/L', plural: 'millimoles per liter', category: 'concentration', categoryName: 'Concentration', baseDimension: BASE_DIMENSIONS.CONCENTRATION_MOLAR, multiplier: 0.001, system: 'SI' },
  
  // Percent-based (note: these are dimensionless ratios, but included for completeness)
  { id: 'percent_weight_weight', name: 'percent (w/w)', symbol: '% w/w', plural: 'percent (w/w)', category: 'concentration', categoryName: 'Concentration', baseDimension: BASE_DIMENSIONS.CONCENTRATION_MASS, multiplier: 10000, system: 'Percent', notes: 'weight per weight' },
  { id: 'percent_weight_volume', name: 'percent (w/v)', symbol: '% w/v', plural: 'percent (w/v)', category: 'concentration', categoryName: 'Concentration', baseDimension: BASE_DIMENSIONS.CONCENTRATION_MASS, multiplier: 10000, system: 'Percent', notes: 'weight per volume' },
  { id: 'ppm', name: 'parts per million', symbol: 'ppm', plural: 'ppm', category: 'concentration', categoryName: 'Concentration', baseDimension: BASE_DIMENSIONS.CONCENTRATION_MASS, multiplier: 1, system: 'Percent' },
  { id: 'ppb', name: 'parts per billion', symbol: 'ppb', plural: 'ppb', category: 'concentration', categoryName: 'Concentration', baseDimension: BASE_DIMENSIONS.CONCENTRATION_MASS, multiplier: 0.001, system: 'Percent' },
  { id: 'ppt', name: 'parts per trillion', symbol: 'ppt', plural: 'ppt', category: 'concentration', categoryName: 'Concentration', baseDimension: BASE_DIMENSIONS.CONCENTRATION_MASS, multiplier: 0.000001, system: 'Percent' },
  
  // Medical
  { id: 'milligram_per_deciliter', name: 'milligram per deciliter', symbol: 'mg/dL', plural: 'milligrams per deciliter', category: 'concentration', categoryName: 'Concentration', baseDimension: BASE_DIMENSIONS.CONCENTRATION_MASS, multiplier: 10, system: 'Medical' },
  { id: 'millimole_per_liter_medical', name: 'millimole per liter', symbol: 'mmol/L', plural: 'millimoles per liter', category: 'concentration', categoryName: 'Concentration', baseDimension: BASE_DIMENSIONS.CONCENTRATION_MOLAR, multiplier: 0.001, system: 'Medical', notes: 'e.g., for glucose, cholesterol' }
]);

// ============================================================================
// 39. TYPOGRAPHY
// ============================================================================

addUnits([
  { id: 'point_postscript', name: 'point (PostScript)', symbol: 'pt', plural: 'points', category: 'typography', categoryName: 'Typography', baseDimension: BASE_DIMENSIONS.TYPOGRAPHY, multiplier: 0.00035277777777778, system: 'Typography', notes: 'PostScript point (1/72 inch)' },
  { id: 'point_tex', name: 'point (TeX)', symbol: 'pt', plural: 'points', category: 'typography', categoryName: 'Typography', baseDimension: BASE_DIMENSIONS.TYPOGRAPHY, multiplier: 0.0003514598035146, system: 'Typography', notes: 'TeX point' },
  { id: 'pica', name: 'pica', symbol: 'pc', plural: 'picas', category: 'typography', categoryName: 'Typography', baseDimension: BASE_DIMENSIONS.TYPOGRAPHY, multiplier: 0.0042333333333333, system: 'Typography' },
  { id: 'em', name: 'em', symbol: 'em', plural: 'em', category: 'typography', categoryName: 'Typography', baseDimension: BASE_DIMENSIONS.TYPOGRAPHY, multiplier: 0.0042333333333333, system: 'Typography', notes: 'relative to font size' },
  { id: 'en', name: 'en', symbol: 'en', plural: 'en', category: 'typography', categoryName: 'Typography', baseDimension: BASE_DIMENSIONS.TYPOGRAPHY, multiplier: 0.0021166666666667, system: 'Typography', notes: 'half of em' },
  { id: 'pixel', name: 'pixel', symbol: 'px', plural: 'pixels', category: 'typography', categoryName: 'Typography', baseDimension: BASE_DIMENSIONS.TYPOGRAPHY, multiplier: 0.00026458333333333, system: 'Digital', notes: 'at 96 DPI/PPI' }
]);

