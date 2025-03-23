import { useState } from "react";
import { Header } from "../../components/Header"
import "./style.scss"

export const HomePage = () => {

    const productsType = ["Пицца", "Закуски", "Напитки", "Десерты", "Соусы"];
    const kitchenType = ["Русская", "Итальянская", "Японская", "Греческая"];

    const [selectedProdType, setSelectedProdType] = useState<string>(productsType[0]);
    const [selectedKitchenType, setSelectedKitchenType] = useState<string>(productsType[0]);


    return <>
        <Header />
        <div className="main-content">

            <div className="select-product-type">
                {productsType.map((type, index) => {
                    return <>
                        <button onClick={() => setSelectedProdType(productsType[index])} className="select-product-type__type-item">
                            <img src={require(`../../shared/icons/prodType${index}.svg`)} alt="" className="product-type-item__img" />
                            <p className="product-type-item__label">{type}</p>
                        </button>
                    </>
                })}
            </div>

            <div className="select-kitchen-type">
                {kitchenType.map((type, index) => {
                    return <>
                        <button onClick={() => setSelectedKitchenType(kitchenType[index])} className={"select-kitchen-type__type-item " + (selectedKitchenType === kitchenType[index] ? "selected-type" : "")}>
                            <p className="kitchen-type-item__label">{type}</p>
                        </button>
                    </>
                })}
            </div>

        </div>
    </>
}