// import * as Reactangle1 from "../../shared/icons/Rectangle1.png";

import { User } from "../../shared/DataTypes"
import "./style.scss"

export const Header = (props: { user: User | null }) => {
    return <>
        <header className="header">
            <a href="#" className="header__logo">
                {/* <img src={Reactangle1} alt="logo" /> */}
                <p className="header__logo-text">Kanagawa <br /> Pizza Place</p>
            </a>
            <div className="header__official">

                <span className="highlight">Вкусная пицца, созданная с <span className="pulse">любовью</span></span>
            </div>

            <div className="header__contacts">
                <p className="header__userName">{props.user ? props.user.username : "Войдите в аккаунт"}</p>
                <a href="/lk" className="button_for_head">Личный кабинет</a>
            </div>
        </header>
    </>
}