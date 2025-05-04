import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/Home';
import { UserAccountPage } from './pages/UserAccount';
import { NotFoundPage } from './pages/NotFound/Index';
import { UserContainer } from './shared/Containers/UserContainer';
import { User } from './shared/DataTypes';
import { MainApi } from './shared/OpenAPI/Api';
import { AboutAppPage } from './pages/AboutApp';
import { ApproveContainer } from './shared/Containers/ApproveModal';

import './App.css';

const App = () => {

  const [user, setUser] = useState<User | null>(null);

  const [modalData, setModalData] = useState<{ text: string, resolve: Function, reject: Function } | null>(null);
  const approveModalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const mainApi = new MainApi();
    mainApi.getUserInfo()
      .then(res => {
        if (!res.detail) setUser(res);
      })

    const interval = setInterval(async () => {
      const mainApi = new MainApi();
      const res = await mainApi.getUserInfo();
      if (!res.detail) setUser(res);
    }, 5000);

    return () => clearInterval(interval);
    //eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (approveModalRef && approveModalRef.current) {
      if (modalData) approveModalRef.current.showModal();
      else approveModalRef.current.close()
    }
  }, [modalData])

  return <>

    <UserContainer.Provider value={{ user: user, setUser: (user: User) => setUser(user) }} >
      <ApproveContainer.Provider value={setModalData}>

        <dialog ref={approveModalRef} className='approve-modal'>
          {modalData && <>
            <h3>Вы уверены что хотите {modalData.text}?</h3>
            <div className="approve-modal__buttons-container">
              <button className='buttons-container__resolve' onClick={() => modalData.resolve()}>Да</button>
              <button className='buttons-container__reject' onClick={() => modalData.reject()}>Нет</button>
            </div>
          </>}
        </dialog>

        <Routes>
          <Route path="/" element={<HomePage />}></Route>
          <Route path="/lk" element={<UserAccountPage />}></Route>
          <Route path="/about-app" element={<AboutAppPage />}></Route>
          <Route path="/*" element={<NotFoundPage />}></Route>
        </Routes>
      </ApproveContainer.Provider>
    </UserContainer.Provider >
  </>
}

export default App;
