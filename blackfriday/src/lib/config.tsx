import { createContext, useContext } from 'react';
import { DEFAULT_CONFIG, type Config } from '../data/config';

export const ConfigContext = createContext<Config>(DEFAULT_CONFIG);
export const useConfig = () => useContext(ConfigContext);
