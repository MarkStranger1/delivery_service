// import * as Reactangle1 from "../../shared/icons/Rectangle1.png";

import "./style.scss"

export const Header = () => {
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
                <a href="tel:+79083807057" className="header__phone">+7 (908) 380-70-57 </a>
                <a href="profile.html" className="button_for_head">Личный кабинет</a>
            </div>
        </header>
    </>
}