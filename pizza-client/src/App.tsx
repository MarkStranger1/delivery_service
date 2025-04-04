import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import { HomePage } from './pages/Home';
import { UserAccountPage } from './pages/UserAccount';
import { NotFoundPage } from './pages/NotFound/Index';
import { UserContainer } from './shared/Containers/UserContainer';
import { User } from './shared/DataTypes';
import { UserApi } from './shared/OpenAPI/Api';

const App = () => {

  const [user, setUser] = useState<User | null>(null);

  const userApi = new UserApi();

  useEffect(() => {
    userApi.getUserInfo()
      .then(res => {
        if (!res.detail) setUser(res);
      })

    const interval = setInterval(async () => {
      const res = await userApi.getUserInfo();
      if (!res.detail) setUser(res);
    }, 5000);

    return () => clearInterval(interval);
    //eslint-disable-next-line
  }, [])

  return <>

    <UserContainer.Provider value={{ user: user, setUser: (user: User) => setUser(user) }} >
      <Routes>
        <Route path="/" element={<HomePage />}></Route>
        <Route path="/lk" element={<UserAccountPage />}></Route>
        <Route path="/*" element={<NotFoundPage />}></Route>
      </Routes>
    </UserContainer.Provider >
  </>
}

export default App;
