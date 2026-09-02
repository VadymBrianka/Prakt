import React from 'react';
import { useFurniStock } from './src/hooks/useFurniStock';
import MainView from './src/views/MainView';

export default function App() {
  const model = useFurniStock();
  return <MainView model={model} />;
}