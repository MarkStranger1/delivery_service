import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import { HomePage } from './pages/Home';
import { UserAccountPage } from './pages/UserAccount';
import { NotFoundPage } from './pages/NotFound/Index';

const App = () => {
  return <>
    <Routes>
      <Route path="/" element={<HomePage />}></Route>
      <Route path="/lk" element={<UserAccountPage />}></Route>
      <Route path="/*" element={<NotFoundPage />}></Route>
    </Routes>
  </>
}

export default App;
