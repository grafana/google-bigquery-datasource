---
'grafana-bigquery-datasource': major
---

Sets the least supported version of Grafana to 11.6.x, and updates @grafana package dependencies accordingly
Removes warnings for deprecated functions and components (i.e. Select -> ComboBox, substr -> substring etc), some warnings were removed by disabling lint warnings due to incompatibility of migration at the moment
Updates docs and tests as well as prettier config for import sorting
