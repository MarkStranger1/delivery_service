//@ts-ignore
import Logo from "../../shared/assets/logo.svg";

import { User } from "../../shared/DataTypes"
import "./style.scss"

export const Header = (props: { user: User | null, onLogout?: Function }) => {

    return <>
        <header className="header">
            <div className="header__header-container">
                <a href="/" className="header__logo">
                    <img src={Logo} alt="logo" />
                    <p className="header__logo-text">Kanagawa <br /> Pizza Place</p>
                </a>
                <div className="header__official">
                    <span className="highlight">Вкусная еда, созданная с любовью</span>
                </div>

                <div className="header__contacts">
                    <p className="header__userName">{props.user ? props.user.username : "Войдите в аккаунт"}</p>
                    {
                        props.user && props.user.id !== -1 && window.location.href.endsWith("/lk") ?
                            <button onClick={() => props.onLogout && props.onLogout()} className="button_for_head button-light hover-button">Выйти</button>
                            :
                            <a href="/lk" className="button_for_head button-light hover-button">Личный кабинет</a>
                    }
                </div>
            </div>
        </header>
    </>
}