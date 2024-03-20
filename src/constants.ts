import { SelectableValue } from '@grafana/data';
import { QueryFormat, QueryPriority } from './types';

export const QUERY_FORMAT_OPTIONS = [
  { label: 'Time series', value: QueryFormat.Timeseries },
  { label: 'Table', value: QueryFormat.Table },
];

export const PROCESSING_LOCATIONS: Array<SelectableValue<string>> = [
  // Allow BigQuery to select the processing location.
  { label: 'Automatic location selection', value: '' },

  // Multi-regional locations
  { label: 'United States (US)', value: 'US' },
  { label: 'European Union (EU)', value: 'EU' },

  // Americas
  { label: 'Columbus, Ohio (us-east5)', value: 'us-east5' },
  { label: 'Dallas (us-south1)', value: 'us-south1' },
  { label: 'Iowa (us-central1)', value: 'us-central1' },
  { label: 'Los Angeles (us-west2)', value: 'us-west2' },
  { label: 'Las Vegas (us-west4)', value: 'us-west4' },
  { label: 'Montréal (northamerica-northeast1)', value: 'northamerica-northeast1' },
  { label: 'Northern Virginia (us-east4)', value: 'us-east4' },
  { label: 'Oregon (us-west1)', value: 'us-west1' },
  { label: 'Salt Lake City (us-west3)', value: 'us-west3' },
  { label: 'São Paulo (southamerica-east1)', value: 'southamerica-east1' },
  { label: 'Santiago (southamerica-west1)', value: 'southamerica-west1' },
  { label: 'South Carolina (us-east1)', value: 'us-east1' },
  { label: 'Toronto (northamerica-northeast2)', value: 'northamerica-northeast2' },

  // Europe
  { label: 'Belgium (europe-west1)', value: 'europe-west1' },
  { label: 'Berlin (europe-west10)', value: 'europe-west10' },
  { label: 'Finland (europe-north1)', value: 'europe-north1' },
  { label: 'Frankfurt (europe-west3)', value: 'europe-west3' },
  { label: 'London (europe-west2)', value: 'europe-west2' },
  { label: 'Madrid (europe-southwest1)', value: 'europe-southwest1' },
  { label: 'Milan (europe-west8)', value: 'europe-west8' },
  { label: 'Netherlands (europe-west4)', value: 'europe-west4' },
  { label: 'Paris (europe-west9)', value: 'europe-west9' },
  { label: 'Turin (europe-west12)', value: 'europe-west12' },
  { label: 'Warsaw (europe-central2)', value: 'europe-central2' },
  { label: 'Zürich (europe-west6)', value: 'europe-west6' },

  // Asia Pacific
  { label: 'Delhi (asia-south2)', value: 'asia-south2' },
  { label: 'Hong Kong (asia-east2)', value: 'asia-east2' },
  { label: 'Jakarta (asia-southeast2)', value: 'asia-southeast2' },
  { label: 'Melbourne (australia-southeast2)', value: 'australia-southeast2' },
  { label: 'Mumbai (asia-south1)', value: 'asia-south1' },
  { label: 'Osaka (asia-northeast2)', value: 'asia-northeast2' },
  { label: 'Seoul (asia-northeast3)', value: 'asia-northeast3' },
  { label: 'Singapore (asia-southeast1)', value: 'asia-southeast1' },
  { label: 'Sydney (australia-southeast1)', value: 'australia-southeast1' },
  { label: 'Taiwan (asia-east1)', value: 'asia-east1' },
  { label: 'Tokyo (asia-northeast1)', value: 'asia-northeast1' },

  // Middle East
  { label: 'Dammam (me-central2)', value: 'me-central2' },
  { label: 'Doha (me-central1)', value: 'me-central1' },
  { label: 'Tel Aviv (me-west1)', value: 'me-west1' },
];

export const QUERY_PRIORITIES: Array<SelectableValue<QueryPriority>> = [
  { label: 'Interactive', value: QueryPriority.Interactive },
  { label: 'Batch', value: QueryPriority.Batch },
];
