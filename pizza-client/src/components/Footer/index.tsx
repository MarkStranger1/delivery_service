//@ts-ignore
import PizzaImg from "../../shared/assets/pizza/p1avif.avif"
//@ts-ignore
import ServiceImg from "../../shared/assets/serviceImg.svg"

import "./style.css"

export const Footer = () => {
    return <>
        <div className="footer">
            <div className="footer__left-content">
                <img src={PizzaImg} alt="pizza-img" className="left-content__img" />
                <a href="about-app" target="_blank" className="left-content__about--app">О сайте</a>
                <a href="about-app" target="_blank" className="left-content__about--company">О компании</a>
            </div>
            <div className="footer__right-content">
                <img src={ServiceImg} alt="service-img" className="right-content__img" />
                <p className="right-content__about--app">Поддержка</p>
                <a href="tel:+79083807057" className="right-content__about--company">+7 (908) 380-70-57 </a>
            </div>
        </div>
    </>
}