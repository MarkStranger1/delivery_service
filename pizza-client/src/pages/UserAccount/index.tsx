import { useState } from "react"
import { Link } from "react-router-dom";
import { User } from "../../shared/DataTypes"

import "./style.scss"


export const UserAccountPage = () => {

    const defaultUser = {
        id: -1,
        email: "",
        username: "",
        phone: "",
        scores: 0,
        role: "user"
    }

    const [userRole, setUserRole] = useState<"anonim" | "user" | "deliver" | "manager">("anonim");
    const [user, setUser] = useState<User>()

    const [userPass, setUserPass] = useState<string>("");
    const [tmpPass, setTmpPass] = useState<string>("");

    const changeValue = (key: string, value: string) => {
        const tmp = JSON.parse(JSON.stringify(user));
        tmp[key] = value;
        setUser(tmp);
    }

    return <>
        <div className="user-page">

            <div className="user-page__header">
                <Link to="/" className="header__return">Назад</Link>
                <p className="header__title">Личный кабинет</p>
            </div>

            <div className="user-page__nav-bar">
                {
                    ["anonim", "user", "deliver", "manager"].map((userRole) => {
                        return <>
                            <button className="change-user" onClick={() => {
                                setUser(defaultUser);
                                //@ts-ignore
                                setUserRole(userRole);
                            }}>{userRole}</button>
                        </>
                    })
                }
            </div>

            <div className="user-page__main-content">
                <h1 className="main-content__header">{userRole}</h1>
                {userRole === "anonim"
                    && user
                    && <>
                        <div className="main-content__create-login-form">
                            <div className="create-login-form__form-item">
                                <label>Username</label>
                                <input
                                    type="text"
                                    className="create-login-form__input input-login"
                                    value={user.username}
                                    onChange={(e) => changeValue("username", e.target.value)}
                                    placeholder="Enter username"
                                />
                            </div>
                            <div className="create-login-form__form-item">
                                <label>Email</label>
                                <input
                                    type="email"
                                    className="create-login-form__input input-email"
                                    value={user.email}
                                    onChange={(e) => changeValue("email", e.target.value)}
                                    placeholder="Enter email@email.com"
                                />
                            </div>
                            <div className="create-login-form__form-item">
                                <label>Phone number</label>
                                <input
                                    type="text"
                                    className="create-login-form__input input-phone"
                                    value={user.phone}
                                    onChange={(e) => changeValue("phone", e.target.value)}
                                    placeholder="+79998887766"
                                />
                            </div>
                            <div className="create-login-form__form-item">
                                <label>Password</label>
                                <input
                                    type="password"
                                    className="create-login-form__input input-passwd"
                                    value={userPass}
                                    onChange={(e) => setUserPass(e.target.value)}
                                    placeholder="Enter password"
                                />
                            </div>
                            <div className="create-login-form__form-item">
                                <label>Password {userPass !== "" && tmpPass !== "" && userPass !== tmpPass ? "Not eval" : ""}</label>
                                <input
                                    type="password"
                                    className="create-login-form__input input-passwd"
                                    value={tmpPass}
                                    onChange={(e) => setTmpPass(e.target.value)}
                                    placeholder="Enter password"
                                />
                            </div>
                            <button className="create-login-form__button-submit" onClick={() => console.log(user, { userPass })}>
                                Create Login
                            </button>
                        </div>
                    </>}
                {userRole === "user"
                    && <>
                        <h3>Текущий заказ</h3>
                        <h3>Список оплаченных заказов</h3>
                    </>}
                {userRole === "deliver"
                    && <>
                        <h3>Текущий заказ</h3>
                        <h3>Список доставленных заказов</h3>
                    </>}

                {userRole === "manager"
                    && <>
                        <h3>Список заказов всех пользователей</h3>
                    </>}
            </div>
        </div >
    </>
}