import { useContext, useEffect, useRef, useState } from "react";
import { Header } from "../../components/Header"
import { Cart as CartType, DeliveryAddress, Dish, TypeOfDish } from "../../shared/DataTypes";
import Spinner from 'react-bootstrap/Spinner';
import { MainApi, ClientApi } from "../../shared/OpenAPI/Api";

import { UserContainer } from "../../shared/Containers/UserContainer";
import Cart from "../../components/Cart";
import { Footer } from "../../components/Footer";
import { DishImg } from "../../components/DishImg";

//@ts-ignore
import FirstStock from "../../shared/assets/креветочное комбо.png"
//@ts-ignore
import SecondStock from "../../shared/assets/сезон персиков.png"
//@ts-ignore
import ThirdStock from "../../shared/assets/яркое трио.png"

import "./style.scss"


export const HomePage = () => {

    const kitchenType = ["Русская", "Итальянская", "Японская", "Греческая"];

    const dialogRef = useRef<HTMLDialogElement>(null);

    const [selectedProdType, setSelectedProdType] = useState<TypeOfDish | null>(null);
    const [selectedKitchenType, setSelectedKitchenType] = useState<string | null>(kitchenType[0]);

    const [productsType, setProductsType] = useState<Array<TypeOfDish> | null>(null)
    const [dishesData, setDishesData] = useState<Array<Dish> | null>(null);

    const [modalData, setModalData] = useState<Dish | null>(null);
    const [changeData, setChangeData] = useState<-1 | 1>(1);

    const [userCart, setUserCart] = useState<CartType | null>(null);
    const [userAddresses, setUserAddresses] = useState<Array<DeliveryAddress> | null>(null);

    const { user } = useContext(UserContainer);

    const responsive = {
        desktop: {
            breakpoint: { max: 3000, min: 1024 },
            items: 3,
            slidesToSlide: 3 // optional, default to 1.
        },
        tablet: {
            breakpoint: { max: 1024, min: 464 },
            items: 2,
            slidesToSlide: 2 // optional, default to 1.
        },
        mobile: {
            breakpoint: { max: 464, min: 0 },
            items: 1,
            slidesToSlide: 1 // optional, default to 1.
        }
    };

    const applyFilter = (data: Array<Dish>) => {
        enum cuisineConvert {
            'русская' = 'russian_cuisine',
            'итальянская' = 'italian_cuisine',
            'японская' = 'japanese_cuisine',
            'греческая' = 'georgian_cuisine',
        }

        if (selectedProdType)
            return data
                .filter(dish => dish.type.slug === selectedProdType.slug)
                .filter(dish => {
                    if (!selectedKitchenType) return true;
                    else return dish.cuisine === cuisineConvert[selectedKitchenType.toLowerCase() as keyof typeof cuisineConvert]
                });
        return data;
    }

    const changeTypeHandler = (whatChange: 'prod' | 'kitchen', type: TypeOfDish | string | null) => {
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

    const addDishToCart = (dish: Dish) => {
        if (user && userCart) {
            const userApi = new ClientApi();

            const copy = JSON.parse(JSON.stringify(userCart));
            const addingDish = copy.dishes.find((d: any) => d.dish === dish.name);

            if (addingDish) {
                addingDish.quantity++;
            }
            else {
                copy.dishes.push({
                    id: dish.id,
                    dish: dish.name,
                    quantity: 1
                });
            }

            Object.assign(copy, { dishes_ordered: copy.dishes });
            delete copy.dishes;

            const defaultAddress = userAddresses?.find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
            copy.address = defaultAddress.id ?? "";

            copy.dishes_ordered.forEach((d: any) => {
                if (typeof d.dish === "string" && d.id) {
                    d.dish = d.id
                    delete d.id;
                }
            })

            userApi.updateUserCart(copy)
                .then(r => {
                    userApi.getUserCart()
                        .then(res => setUserCart(res[0]))
                })
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
        if (user) {
            const userApi = new ClientApi();
            userApi.getUserCart()
                .then(res => setUserCart(res[0]));
            userApi.getDeliveryAddresses()
                .then(res => setUserAddresses(res));
        }
    }, [user])

    useEffect(() => {
        if (!selectedProdType && productsType)
            setSelectedProdType(productsType[0]);
        //eslint-disable-next-line
    }, [productsType])

    useEffect(() => {
        if (dialogRef && dialogRef.current) dialogRef.current.showModal();
    }, [modalData])


    return <>
        <Header user={user} />
        <div className="main-content">

            {
                dishesData
                    && productsType
                    ?
                    <>
                        {/* <div style={{
                            width: "fit-content",
                            margin: "0 auto",
                            paddingTop: "30px"
                        }}>
                            <Carousel centerMode={true} responsive={responsive}>
                                <img style={{ maxHeight: "250px" }} src={FirstStock} alt="stock-img" />
                                <img style={{ maxHeight: "250px" }} src={SecondStock} alt="stock-img" />
                                <img style={{ maxHeight: "250px" }} src={ThirdStock} alt="stock-img" />
                            </Carousel>
                        </div> */}

                        {modalData && <>
                            <dialog className="modal-container" ref={dialogRef}>

                                <button className="close-modal-button" style={{ right: "220px" }} onClick={() => setModalData(null)} />
                                <DishImg
                                    key={modalData.name}
                                    className="modal-container__left-content"
                                    img={modalData.image}
                                    onClick={() => { }}
                                />


                                <div className="modal-container__right-content">
                                    <h1 className="right-content__title">{modalData.name}</h1>
                                    <p className="right-content__desc">{modalData.description}</p><br />
                                    <b>Ингридиенты:</b><br />
                                    <div className="right-content__ingredients-container">
                                        {modalData.ingredients.map(ing => {
                                            return `${ing.name.charAt(0).toUpperCase() + ing.name.slice(1)} - ${ing.amount} ${ing.measurement_unit}`
                                        }).join(', ')}
                                    </div>
                                    <p className="right-content__food-value">{modalData.weight} г. - {modalData.ccal} Ккал</p>
                                    {
                                        user && user.id !== -1 && user.role === "client" && <>
                                            <div className="right-content__bottom">
                                                <p>{modalData.cost}руб.</p>
                                                <button className="modal-container__button button-dark" onClick={() => addDishToCart(modalData)}>В корзину</button>
                                            </div>
                                        </>
                                    }
                                </div>
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
                            <button
                                onClick={() => changeTypeHandler('kitchen', null)}
                                className={"select-kitchen-type__type-item " + (selectedKitchenType === null ? "selected-type" : "")}
                            >
                                <p className="kitchen-type-item__label">Все кухни</p>
                            </button>
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

                        {user
                            && user.role === 'client'
                            && userCart
                            && userAddresses
                            && <>
                                <Cart
                                    userCart={userCart}
                                    userAddresses={userAddresses}
                                    allDishes={dishesData}
                                    forceUpdCart={() => {
                                        const userApi = new ClientApi();
                                        userApi.getUserCart()
                                            .then(res => setUserCart(res[0]))
                                    }}
                                />
                            </>}

                        <div
                            className={"dishes-container " + (changeData === 1 ? 'fade-in' : changeData === -1 ? 'fade-out' : '')}
                            style={changeData === 1 ? { opacity: 100 } : changeData === -1 ? { opacity: 100 } : {}}
                        >
                            {dishesData
                                && applyFilter(dishesData).map(dish => {
                                    return <>
                                        <div
                                            className="dishes-container__dish-item"
                                            key={`${dish.id}${dish.name}__${dish.type.slug}`}

                                        >
                                            <DishImg
                                                key={dish.name}
                                                className=""
                                                img={dish.image}
                                                onClick={() => setModalData(dish)}
                                            />
                                            <p className="dish-item__title">{dish.name}</p>
                                            <span className="dish-item__desc">{dish.description}</span>
                                            {user && user.role === "client" && <div className="dish-item__cart-interaction">
                                                <p className="cart-interaction__cost">{dish.cost}руб.</p>
                                                <button
                                                    className="cart-interaction__add-to-cart-button button-dark"
                                                    onClick={() => {
                                                        if (userCart && userAddresses) {
                                                            const userApi = new ClientApi();

                                                            const copy = JSON.parse(JSON.stringify(userCart));

                                                            const findedDish = dishesData.find(d => d.id === dish.id);

                                                            if (findedDish) {
                                                                const existInList = copy.dishes.find((d: any) => d.id === findedDish.id);
                                                                if (existInList) {
                                                                    existInList.quantity++;
                                                                }
                                                                else {
                                                                    copy.dishes.push({
                                                                        dish: dish.id,
                                                                        quantity: 1
                                                                    })
                                                                }
                                                                Object.assign(copy, { dishes_ordered: copy.dishes });
                                                                delete copy.dishes;

                                                                copy.dishes_ordered.forEach((d: any) => {
                                                                    if (typeof d.dish === "string" && d.id) {
                                                                        d.dish = d.id
                                                                        delete d.id;
                                                                    }
                                                                })

                                                                if (!copy.address) {
                                                                    const defaultAddress = userAddresses?.find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
                                                                    copy.address = defaultAddress.id ?? "";
                                                                }
                                                                else {
                                                                    const address = userAddresses.find((add: DeliveryAddress) => add.delivery_address === copy.address) as DeliveryAddress;
                                                                    copy.address = address.id
                                                                }

                                                                userApi.updateUserCart(copy)
                                                                    .then(r => {
                                                                        userApi.getUserCart()
                                                                            .then(res => setUserCart(res[0]))
                                                                    })
                                                            }

                                                        }
                                                    }}>В корзину</button>
                                            </div>}
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
        <Footer needAbout={true} />
    </>
}