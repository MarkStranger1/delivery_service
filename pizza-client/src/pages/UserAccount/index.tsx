import { useEffect, useState } from "react"
import { Link } from "react-router-dom";
import { User } from "../../shared/DataTypes"

import "./style.scss"
import { UserApi } from "../../shared/OpenAPI/Api";


export const UserAccountPage = () => {

    const defaultUser: User = {
        id: -1,
        email: "",
        username: "",
        phone: "",
        scores: 0,
        role: "anonim"
    }

    const api = new UserApi();

    const [userRegister, setUserRegister] = useState<User>();
    const [userLogin, setUserLogin] = useState<User>();

    const [userRegisterPass, setUserRegisterPass] = useState<string>("");
    const [userLoginPass, setUserLoginPass] = useState<string>("");
    const [tmpPass, setTmpPass] = useState<string>("");

    const [selectedPage, setSelectedPage] = useState<'login' | 'updData' | 'currOrder' | 'allOrders'>('login');

    const changeValue = (key: string, value: string, login: boolean = false) => {
        const tmp = JSON.parse(JSON.stringify(login ? userLogin : userRegister));
        tmp[key] = value;
        login ? setUserLogin(tmp) : setUserRegister(tmp);
    }

    useEffect(() => {
        setUserLogin(defaultUser);
        setUserRegister(defaultUser);

        const interval = setInterval(async () => {
            const res = await api.getUserInfo();
            if (!res.detail) setUserLogin(res);
        }, 5000);

        return () => clearInterval(interval);
        //eslint-disable-next-line
    }, [])

    return <>
        <div className="user-page">

            <div className="user-page__header">
                <Link to="/" className="header__return">Назад</Link>
                <p className="header__title">Личный кабинет</p>
            </div>

            <div className="user-page__nav-bar">
                {userLogin?.id === -1
                    ? <>
                        <button className="nav-bar__nav-item" disabled>Войти</button>
                    </>
                    :
                    <>
                        {userLogin?.role === 'client'
                            &&
                            <>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('updData')}>Изменить личные данные</button>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('currOrder')}>Текущий заказ</button>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('allOrders')}>Список оплаченных заказов</button>
                            </>
                        }
                        {userLogin?.role === 'courier'
                            &&
                            <>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('updData')}>Изменить личные данные</button>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('currOrder')}>Текущий заказ</button>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('allOrders')}>Список доставленных заказов</button>
                            </>
                        }
                        {userLogin?.role === 'manager'
                            &&
                            <>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('allOrders')}>Список заказов всех пользователей</button>
                            </>
                        }
                    </>}
            </div>

            <div className="user-page__main-content">

                {userLogin
                    && userLogin?.id === -1
                    && userRegister
                    ? <>
                        <h1 className="main-content__header">Войти в аккаунт или зарегистрироваться</h1>
                        <div className="main-content__forms-container">
                            <div className="forms-container__create-login-form">
                                <h4 className="create-login-form__form-title">Создать аккаунт</h4>
                                <div className="create-login-form__form-item">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        className="create-login-form__input input-login"
                                        value={userRegister.username}
                                        onChange={(e) => changeValue("username", e.target.value)}
                                        placeholder="Enter username"
                                    />
                                </div>
                                <div className="create-login-form__form-item">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        className="create-login-form__input input-email"
                                        value={userRegister.email}
                                        onChange={(e) => changeValue("email", e.target.value)}
                                        placeholder="Enter email@email.com"
                                    />
                                </div>
                                <div className="create-login-form__form-item">
                                    <label>Phone number</label>
                                    <input
                                        type="text"
                                        className="create-login-form__input input-phone"
                                        value={userRegister.phone}
                                        onChange={(e) => changeValue("phone", e.target.value)}
                                        placeholder="+79998887766"
                                    />
                                </div>
                                <div className="create-login-form__form-item">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        className="create-login-form__input input-passwd"
                                        value={userRegisterPass}
                                        onChange={(e) => setUserRegisterPass(e.target.value)}
                                        placeholder="Enter password"
                                    />
                                </div>
                                <div className="create-login-form__form-item">
                                    <label>Password {userRegisterPass !== "" && tmpPass !== "" && userRegisterPass !== tmpPass ? "Not eval" : ""}</label>
                                    <input
                                        type="password"
                                        className="create-login-form__input input-passwd"
                                        value={tmpPass}
                                        onChange={(e) => setTmpPass(e.target.value)}
                                        placeholder="Enter password"
                                    />
                                </div>
                                <button
                                    className="create-login-form__button-submit"
                                    disabled={!userRegister.email || !userRegisterPass}
                                    onClick={() => console.log(userRegister, { userPass: userRegisterPass })}>
                                    Create Login
                                </button>
                            </div>

                            <div className="forms-container__login-form">
                                <h4 className="create-login-form__form-title ">Войти</h4>
                                <div className="login-form__form-item">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        className="create-login-form__input input-email"
                                        value={userLogin.email}
                                        onChange={(e) => changeValue("email", e.target.value, true)}
                                        placeholder="Enter email@email.com"
                                    />
                                </div>
                                <div className="login-form__form-item">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        className="create-login-form__input input-passwd"
                                        value={userLoginPass}
                                        onChange={(e) => setUserLoginPass(e.target.value)}
                                        placeholder="Enter password"
                                    />
                                </div>
                                <button
                                    className="login-form__button-submit"
                                    disabled={!userLogin.email || !userLoginPass}
                                    onClick={() => {
                                        api.authUser(userLogin, userLoginPass)
                                            .then(async (r) => {
                                                let res = await api.getUserInfo() as User;
                                                setUserLogin(res);
                                                setSelectedPage('currOrder')
                                            })
                                    }}>
                                    Login
                                </button>
                            </div>
                        </div>
                    </>
                    :
                    <>
                        {
                            selectedPage === 'currOrder' && <>
                                <h1>Текущий заказ</h1>
                            </>
                        }
                    </>}
            </div>
        </div >
    </>
}