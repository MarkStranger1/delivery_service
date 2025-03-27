import { useEffect, useRef, useState } from "react";
import { Header } from "../../components/Header"
import { Dish, TypeOfDish } from "../../shared/DataTypes";
import Spinner from 'react-bootstrap/Spinner';
//@ts-ignore
import PizzaImg from "../../shared/assets/pizza/p1avif.avif"
import { MainApi } from "../../shared/OpenAPI/Api";

import "./style.scss"

export const HomePage = () => {

    const kitchenType = ["Русская", "Итальянская", "Японская", "Греческая"];

    const dialogRef = useRef<HTMLDialogElement>(null);

    const [selectedProdType, setSelectedProdType] = useState<TypeOfDish | null>(null);
    const [selectedKitchenType, setSelectedKitchenType] = useState<string>(kitchenType[0]);

    const [productsType, setProductsType] = useState<Array<TypeOfDish> | null>(null)
    const [dishesData, setDishesData] = useState<Array<Dish> | null>(null);

    const [modalData, setModalData] = useState<Dish | null>(null);
    const [changeData, setChangeData] = useState<-1 | 1>(1);

    const applyFilter = (data: Array<Dish>) => {
        enum cuisineConvert {
            'русская' = 'russian_cuisine',
            'итальянская' = 'italian_cuisine',
            'японская' = 'japanese_cuisine',
            'греческая' = 'georgian_cuisine',
        }

        if (selectedProdType)
            return data.filter(dish => dish.type.slug === selectedProdType.slug).filter(dish => dish.cuisine === cuisineConvert[selectedKitchenType.toLowerCase() as keyof typeof cuisineConvert]);
        return data;
    }

    const changeTypeHandler = (whatChange: 'prod' | 'kitchen', type: TypeOfDish | string) => {
        setChangeData(-1);
        if (whatChange === 'prod' && typeof type !== 'string') {
            setTimeout(() => {
                setChangeData(1);
                setSelectedProdType(type);
            }, 500);
        }
        else {
            setTimeout(() => {
                setChangeData(1);
                setSelectedKitchenType(type as string);
            }, 500);
        }

    }

    useEffect(() => {
        const api = new MainApi();
        Promise.all([
            api.getDishes(),
            api.getTypes()
        ]).then(results => {
            setDishesData(results[0]);
            setProductsType(results[1]);
        })

    }, [])

    useEffect(() => {
        if (!selectedProdType && productsType)
            setSelectedProdType(productsType[0]);
        //eslint-disable-next-line
    }, [productsType])

    useEffect(() => {
        if (dialogRef && dialogRef.current) dialogRef.current.showModal();
    }, [modalData])


    return <>
        <Header />
        <div className="main-content">

            {
                dishesData
                    && productsType
                    ?
                    <>
                        {modalData && <>
                            <dialog className="modal-container" ref={dialogRef}>
                                <div className="modal-container__left-content">
                                    <h1 className="left-content__title">{modalData.name}</h1>
                                    <h5 className="left-content__subtitle">{modalData.type.name}</h5>
                                    <p className="left-content__food-value">Пищевая ценность:<br />{modalData.weight} г. - {modalData.ccal} Ккал</p>
                                    <p className="left-content__desc">{modalData.description}</p><br />
                                    <b>Ингридиенты:</b><br />
                                    <div className="left-content__ingredients-container">
                                        {modalData.ingredients.map(ing => {
                                            return <>
                                                <div className="ingredients-container__ing-item">
                                                    <b>Название:</b> {ing.name.charAt(0).toUpperCase() + ing.name.slice(1)}<br />
                                                    <b>Колличество:</b> {ing.amount} {ing.measurement_unit}
                                                </div>
                                            </>
                                        })}
                                    </div>
                                </div>

                                <div className="modal-container__right-content">
                                    <img src={PizzaImg} alt="" className="right-content__img" />
                                </div>

                                <button className="modal-container__return-button" onClick={() => setModalData(null)}>Закрыть</button>
                            </dialog>
                        </>}

                        <div className="select-product-type">
                            {productsType
                                && selectedProdType
                                && productsType.map((type, index) => {
                                    return <>
                                        <button
                                            onClick={() => changeTypeHandler('prod', productsType.find(type => type.id === (index + 1))!)}
                                            className={"select-product-type__type-item " + (selectedProdType?.slug === productsType.find(type => type.id === (index + 1))?.slug ? "selected-prod-type" : '')}>
                                            <img src={require(`../../shared/icons/prodType${index}.svg`)} alt="" className="product-type-item__img" />
                                            <p className="product-type-item__label">{type.name}</p>
                                        </button>
                                    </>
                                })}
                        </div>

                        <div className="select-kitchen-type">
                            {kitchenType.map((type, index) => {
                                return <>
                                    <button
                                        onClick={() => changeTypeHandler('kitchen', kitchenType[index])}
                                        className={"select-kitchen-type__type-item " + (selectedKitchenType === kitchenType[index] ? "selected-type" : "")}
                                    >
                                        <p className="kitchen-type-item__label">{type}</p>
                                    </button>
                                </>
                            })}
                        </div>

                        <div
                            className={"dishes-container " + (changeData === 1 ? 'fade-in' : changeData === -1 ? 'fade-out' : '')}
                            style={changeData === 1 ? { opacity: 100 } : changeData === -1 ? { opacity: 100 } : {}}
                        >
                            {dishesData
                                && applyFilter(dishesData).map(dish => {
                                    return <>
                                        <div className="dishes-container__dish-item" key={`${dish.id}${dish.name}__${dish.type.slug}`}>
                                            <img src={PizzaImg} alt="" className="dish-item__img" />
                                            <p className="dish-item__title">{dish.name}</p>
                                            <span className="dish-item__desc">{dish.description}</span>
                                            <p className="dish-item__about-text" onClick={() => setModalData(dish)}>Подробнее</p>
                                        </div>
                                    </>
                                })}
                        </div>
                    </>
                    :
                    <>
                        <Spinner animation="border" role="status" variant="light">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                    </>
            }



        </div >
    </>
}