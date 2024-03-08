import React, { createContext, useState } from 'react';
import { BigQueryOptions } from '../types';

type DatasourceContextType = {
  onDemandComputePrice?: number;
};

export const DatasourceContext = createContext<DatasourceContextType>({} as DatasourceContextType);

type Props = {
  children: React.ReactNode;
  jsonData: BigQueryOptions;
};
export const DatasourceContextProvider = ({ children, jsonData }: Props) => {
  const [onDemandComputePrice, _] = useState<number | undefined>(jsonData.onDemandComputePrice);

  return <DatasourceContext.Provider value={{ onDemandComputePrice }}>{children}</DatasourceContext.Provider>;
};
