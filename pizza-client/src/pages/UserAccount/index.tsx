import { ReactElement, ReactHTMLElement, useContext, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom";
import { Cart, CourierForManager, DeliveryAddress, Dish, Order, OrderForWorker, User } from "../../shared/DataTypes"

import { MainApi, ClientApi, ManagerApi, CourierApi } from "../../shared/OpenAPI/Api";
import { UserContainer } from "../../shared/Containers/UserContainer";

//@ts-ignore
import AttentionIcon from "../../shared/assets/attention.svg"
//@ts-ignore
import QRCode from "../../shared/assets/qrCode.svg"
//@ts-ignore
import Logo from "../../shared/assets/logoWired.svg"
//@ts-ignore
import TreasureIcon from "../../shared/assets/treasureIcon.svg"
//@ts-ignore
import InfoIcon from "../../shared/assets/infoButton.svg"
//@ts-ignore
import RemoveButton from "../../shared/assets/closeIcon.svg"

import "./style.scss"
import { ApproveContainer } from "../../shared/Containers/ApproveModal";
import { convertDateTime, validateData } from "../../shared/utils/HelpFunctions";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { DishImg } from "../../components/DishImg";
import { DishesContainer } from "../../shared/Containers/DishesContainer";
import * as _ from "lodash";


export const UserAccountPage = () => {

    const defaultUser: User = {
        id: -1,
        email: "",
        username: "",
        phone: "",
        scores: 0,
        role: "anonim"
    }

    const convertOrderStatus = {
        'awaiting_payment': 'ожидание оплаты',
        "awaiting_courier": 'ожидание курьера',
        'deliver': "доставляем",
        'delivered': 'доставлен',
        "cancelled": "отменен"
    }

    const mainApi = new MainApi();
    const clientApi = new ClientApi();
    const courierApi = new CourierApi();
    const managerApi = new ManagerApi();

    const { user, setUser } = useContext(UserContainer);
    const { dishes: dishesContainer } = useContext(DishesContainer);
    const showApproveModal = useContext(ApproveContainer);

    const [userAddresses, setUserAddresses] = useState<Array<DeliveryAddress> | null>(null);
    const [newAddress, setNewAddress] = useState<DeliveryAddress | null>(null);
    const [userOrdersHistory, setUserOrdersHistory] = useState<Array<Order> | null>(null);
    const [userCart, setUserCart] = useState<Cart | null>(null);
    const [activeUserCarts, setActiveUserCarts] = useState<Array<Cart> | null>(null);
    const [editUser, setEditUser] = useState<User | null>(null);

    const [userRegister, setUserRegister] = useState<User>();
    const [userLogin, setUserLogin] = useState<User>();

    const [userRegisterPass, setUserRegisterPass] = useState<string>("");
    const [userLoginPass, setUserLoginPass] = useState<string>("");
    const [tmpPass, setTmpPass] = useState<string>("");
    const [allDishes, setAllDishes] = useState<Array<Dish> | null>(null);

    const [scores4Pay, setScores4Pay] = useState<number | null>(null);
    const [payType, setPayType] = useState<"cash" | "sfp">("cash");
    const approvePayRef = useRef<HTMLDialogElement>(null);

    const [modalData, setModalData] = useState<{
        title: string,
        body: "newAddress" | "aboutScores" | "order4courier" | "client4courier" | "order4manager" | "courier4manager" | "prevOrder4manager",
        forBody?: OrderForWorker | { id: number, username: string, phone: string, email: string } | { id: number, username: string, phone: string, email: string, courierOrders: Array<any> }
    } | null>(null);
    const helpModalRef = useRef<HTMLDialogElement>(null);

    const [isLogin, setIsLogin] = useState<boolean>(true);

    ///////////////////////////////////FOR COURIER STATE

    const [courierActiveOrders, setCourierActiveOrders] = useState<Array<OrderForWorker> | null>(null);
    const [courierHistory, setCourierHistory] = useState<Array<OrderForWorker> | null>(null);

    ////////////////////////////////////////////////////

    ///////////////////////////////////FOR MANAGER STATE

    const [allOrders, setAllOrders] = useState<Array<OrderForWorker> | null>(null);
    const [allCouriers, setAllCouriers] = useState<Array<CourierForManager> | null>(null);
    const [editedOrder, setEditedOrder] = useState<OrderForWorker | null>(null);
    const [sortByStatus, setSortByStatus] = useState<-1 | 0 | 1>(0);
    const [sortByCount, setSortByCount] = useState<-1 | 0 | 1>(0);
    const editOrderRef = useRef<HTMLDialogElement>(null);

    const convertStatusForSort = {
        'awaiting_courier': 3,
        'deliver': 2,
        'delivered': 1,
    }

    ////////////////////////////////////////////////////


    const [selectedPage, setSelectedPage] = useState<'login' | 'updData' | 'currOrder' | 'allOrders' | 'allActiveOrders' | 'allPrevOrders' | 'allCouriers'>('login');

    const changeValue = (key: string, value: string, state: 'edit' | 'login' | 'register') => {
        let tmp;
        switch (state) {
            case "edit":
                tmp = JSON.parse(JSON.stringify(editUser));
                break;
            case "login":
                tmp = JSON.parse(JSON.stringify(userLogin));
                break;
            case "register":
                tmp = JSON.parse(JSON.stringify(userRegister));
                break;
        }

        tmp[key] = value;
        switch (state) {
            case "edit":
                setEditUser(tmp);
                break;
            case "login":
                setUserLogin(tmp);
                break;
            case "register":
                setUserRegister(tmp);
                break;
        }
    }

    const getDishTotalCostById = (dishId: number, count: number): number => {
        if (allDishes) {
            const finded = allDishes.find(dish => dish.id === dishId);
            if (finded)
                return finded.cost * count;
        }
        return 0;
    }

    const addDishHandler = (dishName: string) => {
        if (user) {
            const clientApi = new ClientApi();

            const copy = JSON.parse(JSON.stringify(userCart));
            const incDish = copy.dishes.find((d: any) => d.dish === dishName);

            if (incDish) {
                incDish.quantity++;

                Object.assign(copy, { dishes_ordered: copy.dishes });
                delete copy.dishes;

                if (!copy.address) {
                    const defaultAddress = userAddresses?.find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
                    copy.address = defaultAddress.id ?? "";
                }
                else {
                    const address = userAddresses?.find((add: DeliveryAddress) => add.delivery_address === copy.address) as DeliveryAddress;
                    copy.address = address.id
                }

                copy.dishes_ordered.forEach((d: any) => {
                    if (typeof d.dish === "string" && d.id) {
                        d.dish = d.id
                        delete d.id;
                    }
                })

                clientApi.updateUserCart(copy)
                    .then(r => {
                        clientApi.getUserCart()
                            .then(res => {
                                setUserCart(res[0]);
                            })
                    })
            }
        }
    }

    const removeDishHandler = (dishName: string, clear: boolean = false) => {
        if (user) {
            const clientApi = new ClientApi();

            const copy = JSON.parse(JSON.stringify(userCart));
            const removedDish = copy.dishes.find((d: any) => d.dish === dishName);

            if (removedDish) {
                if (removedDish.quantity > 1 && !clear) {
                    removedDish.quantity--;
                }
                else {
                    copy.dishes = copy.dishes.filter((d: any) => d.dish !== dishName);
                }

                Object.assign(copy, { dishes_ordered: copy.dishes });
                delete copy.dishes;

                if (!copy.address) {
                    const defaultAddress = userAddresses?.find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
                    copy.address = defaultAddress.id ?? "";
                }
                else {
                    const address = userAddresses?.find((add: DeliveryAddress) => add.delivery_address === copy.address) as DeliveryAddress;
                    copy.address = address.id
                }

                copy.dishes_ordered.forEach((d: any) => {
                    if (typeof d.dish === "string" && d.id) {
                        d.dish = d.id
                        delete d.id;
                    }
                })

                clientApi.updateUserCart(copy)
                    .then(r => {
                        clientApi.getUserCart()
                            .then(res => {
                                setUserCart(res[0]);
                            })
                    })
            }
        }
    }

    const clearCartHandler = () => {
        const copy = JSON.parse(JSON.stringify(userCart));

        Object.assign(copy, { dishes_ordered: [] });
        delete copy.dishes;

        const defaultAddress = userAddresses?.find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
        copy.address = defaultAddress.id ?? "";


        clientApi.updateUserCart(copy)
            .then(r => {
                clientApi.getUserCart()
                    .then(res => {
                        setUserCart(res[0]);
                    })
            })
    }

    const sortByDeliveryTimeFoo = (a: OrderForWorker, b: OrderForWorker) => Date.parse(a.delivery_time) - Date.parse(b.delivery_time)

    const sortByStatusFoo = (a: OrderForWorker, b: OrderForWorker) => {
        if (sortByStatus === 1)
            return convertStatusForSort[a.status as keyof typeof convertStatusForSort] - convertStatusForSort[b.status as keyof typeof convertStatusForSort]
                || (new Date(a.delivery_time) as any) - (new Date() as any)
                || (new Date(b.delivery_time) as any) - (new Date() as any);
        if (sortByStatus === -1)
            return convertStatusForSort[b.status as keyof typeof convertStatusForSort] - convertStatusForSort[a.status as keyof typeof convertStatusForSort]
                || (new Date(a.delivery_time) as any) - (new Date() as any)
                || (new Date(b.delivery_time) as any) - (new Date() as any);
        return 0;
    }

    const sortByCountFoo = (a: CourierForManager, b: CourierForManager) => {
        const courierAOrders = allOrders ? allOrders?.filter(order => order.courier && order.courier.id === a.id) : []
        const courierBOrders = allOrders ? allOrders?.filter(order => order.courier && order.courier.id === b.id) : []
        if (sortByCount === 1) return courierAOrders.length - courierBOrders.length;
        if (sortByCount === -1) return courierBOrders.length - courierAOrders.length;
        return 0;
    }

    const validateForm = (formData: User): boolean => {
        return validateData(formData.username, "username")
            && validateData(formData.email, "email")
            && validateData(formData.phone, "phone")
    }

    useEffect(() => {
        const mainApi = new MainApi();
        mainApi.getUserInfo()
            .then((r) => {
                if (!r.detail) {
                    setUserLogin(r);
                    selectedPage === 'login' && setSelectedPage('updData');
                }
            })

        mainApi.getDishes()
            .then(r => {
                !allDishes && setAllDishes(r);
            })

        setUserLogin(user ? user : defaultUser);
        setUserRegister(defaultUser);
        //eslint-disable-next-line
    }, [])

    useEffect(() => {
        if (user && user.id !== -1) {
            !editUser && setEditUser(user);


            if (user.role === 'client') {
                Promise.all([
                    clientApi.getOrdersHistory(),
                    clientApi.getUserCart(),
                    clientApi.getDeliveryAddresses(),
                    clientApi.getActiveCart(),
                ]).then(response => {
                    if (response[0] && response[0].length) {
                        const newHistory = response[0].filter((cart: any) => cart.status === "delivered" || cart.status === "cancelled").sort(sortByDeliveryTimeFoo);
                        setUserOrdersHistory(newHistory);
                    }

                    if (response[1].length === 0) {
                        clientApi.createUserCart()
                            .then((r: any) => {
                                r && r.id && clientApi.getUserCart(r.id)
                                    .then((res: any) => {
                                        setUserCart(res)
                                    })
                            })
                    }
                    else {
                        if (!response[1][0].address) {
                            const defaultAddress = response[2].find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
                            if (defaultAddress) {
                                const copy = JSON.parse(JSON.stringify(response[1][0]))
                                copy.address = defaultAddress.id ?? "";

                                Object.assign(copy, { dishes_ordered: copy.dishes });
                                delete copy.dishes;
                                copy.dishes_ordered.forEach((d: any) => {
                                    if (typeof d.dish === "string" && d.id) {
                                        d.dish = d.id
                                        delete d.id;
                                    }
                                })

                                clientApi.updateUserCart(copy)
                                    .then(res => {
                                        setUserCart(res[0]);
                                    })
                            }
                            else {
                                if (response[2].length) {
                                    (response[2][0] as DeliveryAddress).is_default = true
                                    const copy = JSON.parse(JSON.stringify(response[1][0]))
                                    copy.address = response[2][0].id ?? "";

                                    Object.assign(copy, { dishes_ordered: copy.dishes });
                                    delete copy.dishes;
                                    copy.dishes_ordered.forEach((d: any) => {
                                        if (typeof d.dish === "string" && d.id) {
                                            d.dish = d.id
                                            delete d.id;
                                        }
                                    })

                                    clientApi.editDeliveryAddresses(response[2][0].id, true)
                                    clientApi.updateUserCart(copy)
                                        .then(res => {
                                            setUserCart(res[0])
                                        })
                                }

                            }
                        }
                        else {
                            setUserCart(response[1][0])
                        }
                    }
                    setUserAddresses(response[2])
                    !newAddress && setNewAddress({
                        is_default: true,
                        delivery_address: "",
                        id: 0
                    })

                    if (response[3] && response[3].length > 0) {
                        const activeCarts = response[3].filter((cart: any) => cart.status !== "awaiting_payment");
                        setActiveUserCarts(activeCarts);
                    }
                })
            }
            if (user.role === 'courier') {
                Promise.all([
                    courierApi.getActiveOrders(),
                    courierApi.getOrdersHistory()
                ])
                    .then(responses => {
                        if (responses && responses.length) {
                            setCourierActiveOrders(responses[0])
                            setCourierHistory(responses[1])
                        }
                    })
            }
            if (user.role === 'manager') {
                Promise.all([
                    managerApi.getAllOrders(),
                    managerApi.getAllCouriers()
                ])
                    .then(responses => {
                        if (responses && responses.length) {
                            setAllOrders(responses[0].sort(sortByDeliveryTimeFoo));
                            setAllCouriers(responses[1]);
                        }
                    })
            }
        }
        //eslint-disable-next-line
    }, [user])


    useEffect(() => {
        if (helpModalRef.current)
            modalData ? helpModalRef.current.showModal() : helpModalRef.current.close();
    }, [modalData])

    const renderClientPages = () => {
        if (selectedPage === 'updData') return <>
            {editUser
                && <>
                    <div className="main-content__edit-user-info">
                        <div className="edit-user-info__form-item">
                            <label>Логин</label>
                            <input
                                type="text"
                                className="create-login-form__input input-login"
                                value={editUser.username}
                                onChange={(e) => changeValue("username", e.target.value, 'edit')}
                                placeholder="Логин"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <label>Почта</label>
                            <input
                                type="email"
                                className="edit-user-info__input input-email"
                                value={editUser.email}
                                onChange={(e) => changeValue("email", e.target.value, 'edit')}
                                placeholder="Почта"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <label>Телефон</label>
                            <input
                                type="text"
                                className="edit-user-info__input input-phone"
                                value={editUser.phone}
                                onChange={(e) => changeValue("phone", e.target.value, 'edit')}
                                placeholder="Телефон"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <label>Старый</label>
                            <input
                                type="text"
                                className="edit-user-info__input input-password"
                                value={userRegisterPass}
                                onChange={(e) => setUserRegisterPass(e.target.value)}
                                placeholder="Предыдуший пароль"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <label>Новый пароль</label>
                            <input
                                type="text"
                                className="edit-user-info__input input-password"
                                value={userLoginPass}
                                onChange={(e) => setUserLoginPass(e.target.value)}
                                placeholder="Новый пароль"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <label>Повтор нового пароля</label>
                            <input
                                type="text"
                                className="edit-user-info__input input-password"
                                value={tmpPass}
                                onChange={(e) => setTmpPass(e.target.value)}
                                placeholder="Повторите пароль"
                            />
                        </div>
                        <button
                            disabled={
                                userRegisterPass.length === 0
                                || userLoginPass.length === 0
                                || userLoginPass !== tmpPass
                                || !validateForm(editUser)
                                || !validateData(userLoginPass, "password")
                            }
                            className="edit-user-info__button-submit button-dark hover-button"
                            onClick={() => {
                                if (editUser) {
                                    const mainApi = new MainApi();
                                    const copy = JSON.parse(JSON.stringify(editUser))
                                    Object.assign(copy, { "old_password": userRegisterPass, "new_password": userLoginPass });
                                    setTmpPass("");
                                    setUserLoginPass("");
                                    setUserRegisterPass("");
                                    mainApi.editUserInfo(copy)
                                        .then(r => {
                                            const tmp = JSON.parse(JSON.stringify(editUser));
                                            delete tmp.id;
                                            if (Object.keys(tmp).every(key => Object.keys(r).includes(key))) {
                                                alert('Данные успешно обновлены!')
                                            }
                                            else {
                                                alert(Object.keys(r).map(key => r[key]).join('\n'))
                                            }
                                        })
                                }
                            }}>
                            Обновить данные
                        </button>
                    </div>

                    <div className="scores-container">
                        <div style={{ display: "flex", width: "100%", justifyContent: "space-around", alignItems: "center", height: "70px", margin: "7px 0 5px" }}>
                            <img src={TreasureIcon} alt="treasureIcon" />
                            <p className="scores-container__title">У вас {user?.scores} баллов!</p>
                            <img src={TreasureIcon} alt="treasureIcon" />
                        </div>
                        <button className="scores-container__check-about button-dark hover-button" onClick={() => setModalData({ title: "Бальная система", body: "aboutScores" })}>Подробнее</button>
                    </div>

                    <div className="main-content__addresses-list">
                        {userAddresses
                            && userAddresses.length > 0
                            ?
                            <>
                                {userAddresses.sort((a, b) => (a.is_default === b.is_default) ? 0 : a.is_default ? -1 : 1).map(address => {
                                    return <>
                                        <div className="addresses-list__list-item">
                                            <p
                                                className={`list-item__address-text${address.is_default ? '--default-address' : ''}`}
                                                onClick={() => {
                                                    !address.is_default && clientApi.editDeliveryAddresses(address.id, !address.is_default)
                                                        .then(r => {
                                                            clientApi.getDeliveryAddresses()
                                                                .then(r => setUserAddresses(r))
                                                        });
                                                }}>
                                                {address.delivery_address} {address.is_default ? 'по умолчанию' : ''}
                                            </p>
                                            <button
                                                className="list-item__delete-button button-dark hover-button"
                                                style={{ width: "200px" }}
                                                onClick={() => {
                                                    showApproveModal({
                                                        text: `удалить адрес ${address.delivery_address}`,
                                                        resolveText: "Удалить",
                                                        resolve: () => {
                                                            clientApi.deleteDeliveryAddresses(address.id)
                                                                .then(r => {
                                                                    clientApi.getDeliveryAddresses()
                                                                        .then(r => setUserAddresses(r))
                                                                });
                                                            showApproveModal(null);
                                                        },
                                                        reject: () => showApproveModal(null)
                                                    })
                                                }}
                                            />
                                        </div>
                                    </>
                                })}
                                <button
                                    className="list-item__add-address-button button-dark hover-button"
                                    onClick={() => {
                                        setModalData({
                                            title: "Добавление нового адреса доставки",
                                            body: "newAddress"
                                        })
                                    }}
                                >Добавить новый адрес доставки</button>
                            </>
                            :
                            <>
                                <p className="main-content__sub-title">Адреса пока не были добавлены, но никогда не поздно сделать первый заказ!</p>
                                <button
                                    className="list-item__add-address-button button-dark hover-button"
                                    style={{ width: "200px" }}
                                    onClick={() => {
                                        setModalData({
                                            title: "Добавление нового адреса доставки",
                                            body: "newAddress"
                                        })
                                    }}
                                >Добавить новый адрес доставки</button>
                            </>
                        }
                    </div>
                </>
            }
        </>
        if (selectedPage === 'currOrder') return <>
            {user
                && userCart
                && <dialog ref={approvePayRef} className="approvePayModal">
                    <h3>Оплата заказа</h3>
                    <h5>Итоговая сумма к оплате: {scores4Pay ? userCart.total_cost - scores4Pay : 0}руб.</h5>
                    <img src={QRCode} alt="" style={{ width: "325px", aspectRatio: "1" }} />
                    <div className="buttons-container">
                        <button
                            className="buttons-container__back button-dark hover-button"
                            style={{
                                height: "50px",
                                fontSize: "20px",
                                width: "45%"
                            }}
                            onClick={() => approvePayRef.current?.close()}
                        >Назад</button>
                        <button
                            className="buttons-container__approve button-dark hover-button"
                            style={{
                                height: "50px",
                                fontSize: "20px",
                                width: "45%"
                            }}
                            onClick={() => {
                                if (userCart) {
                                    const copy = JSON.parse(JSON.stringify(userCart));
                                    copy.status = "awaiting_courier";

                                    const address = userAddresses?.find((add: DeliveryAddress) => add.delivery_address === copy.address) as DeliveryAddress;
                                    copy.address = address.id

                                    Object.assign(copy, { dishes_ordered: copy.dishes });
                                    delete copy.dishes;
                                    copy.dishes_ordered.forEach((d: any) => {
                                        if (typeof d.dish === "string" && d.id) {
                                            d.dish = d.id
                                            delete d.id;
                                        }
                                    })

                                    if (scores4Pay) {
                                        const userCopy = JSON.parse(JSON.stringify(user)) as User;
                                        userCopy.scores += Math.round((userCart.total_cost - scores4Pay) / 10) - scores4Pay;
                                        mainApi.editUserInfo(userCopy)
                                    }

                                    clientApi.updateUserCart(copy)
                                        .then(r => {
                                            clientApi.getUserCart()
                                                .then(r => {
                                                    setUserCart(r[0]);
                                                    approvePayRef.current?.close();
                                                })
                                        })
                                }
                            }}
                        >Я оплатил</button>
                    </div>
                </dialog>}

            {userCart ? <>
                <div className="main-content__user-cart">
                    <div className="user-cart__container">
                        <div className="dishes__header">
                            <p>Всего блюд - {userCart.count_dishes}шт.</p>
                            <button
                                className="button-dark hover-button"
                                onClick={() => {
                                    showApproveModal({
                                        text: "удалить все блюда из корзины",
                                        resolveText: "Удалить",
                                        resolve: () => { clearCartHandler(); showApproveModal(null); },
                                        reject: () => showApproveModal(null)
                                    })
                                }}>Убрать все</button>
                        </div>
                        {userCart.dishes.map(dish => {
                            return <div className="dishes__dish-item">
                                <DishImg
                                    key={dish.dish}
                                    className="dish-item__img--user-cart"
                                    img={() => (dishesContainer?.find(d => d.id === dish.id)?.image as string) ?? null}
                                    onClick={() => { }}
                                />
                                <p style={{ marginLeft: "10px", }}>{dish.dish}</p>
                                <button className="list-item__add-button" onClick={() => { addDishHandler(dish.dish) }} style={{ width: "25px", height: "25px" }}>+</button>
                                <p style={{ marginLeft: "10px", }}>{dish.quantity}</p>
                                <button className="list-item__delete-button" onClick={() => { removeDishHandler(dish.dish) }} style={{ width: "25px", height: "25px" }}>-</button>
                                <p>{getDishTotalCostById(dish.id, dish.quantity)}руб.</p>
                                <button
                                    className="list-item__remove-button"
                                    style={{
                                        width: "25px",
                                        height: "25px",
                                        marginLeft: "10px",
                                        backgroundSize: "65%",
                                        backgroundImage: `url(${RemoveButton})`,
                                        backgroundRepeat: 'no-repeat'
                                    }}
                                    onClick={() => { removeDishHandler(dish.dish, true) }} />
                            </div>
                        })}

                        <div style={{ display: "flex", justifyContent: "space-between", margin: "20px 50px 10px", fontSize: "20px" }}>
                            <p>Итого:</p>
                            <p>{userCart.total_cost}руб. за {userCart.count_dishes} блюд</p>
                        </div>

                    </div>
                </div>
                <div className="user-cart__container" style={{ padding: "10px" }}>
                    <select
                        className="container__item"
                        value={userCart.address}
                        onChange={(e) => {
                            const copy = JSON.parse(JSON.stringify(userCart));
                            const newAddress = userAddresses?.find((address: DeliveryAddress) => e.target.value === address.delivery_address) as DeliveryAddress;
                            copy.address = newAddress.id ?? "";


                            Object.assign(copy, { dishes_ordered: copy.dishes });
                            delete copy.dishes;
                            copy.dishes_ordered.forEach((d: any) => {
                                if (typeof d.dish === "string" && d.id) {
                                    d.dish = d.id
                                    delete d.id;
                                }
                            })

                            clientApi.updateUserCart(copy)
                                .then(r => {
                                    clientApi.getUserCart()
                                        .then(res => {
                                            setUserCart(res[0]);
                                        })
                                })
                        }}
                    >
                        {userAddresses && userAddresses.length > 0 && userAddresses.map(addr => {
                            return <option value={addr.delivery_address}>{addr.delivery_address}</option>
                        })}
                    </select>
                    <input
                        type="datetime-local"
                        className="container__item"
                        placeholder="Время доставки"
                        value={userCart.delivery_time}
                        onChange={(e) => {
                            const copy = JSON.parse(JSON.stringify(userCart));

                            if (!copy.address) {
                                const defaultAddress = userAddresses?.find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
                                copy.address = defaultAddress.id ?? "";
                            }
                            else {
                                const address = userAddresses?.find((add: DeliveryAddress) => add.delivery_address === copy.address) as DeliveryAddress;
                                copy.address = address.id
                            }

                            if (validateData(e.target.value, "datetime")) {
                                copy.delivery_time = e.target.value;
                            }


                            Object.assign(copy, { dishes_ordered: copy.dishes });
                            delete copy.dishes;
                            copy.dishes_ordered.forEach((d: any) => {
                                if (typeof d.dish === "string" && d.id) {
                                    d.dish = d.id
                                    delete d.id;
                                }
                            })

                            clientApi.updateUserCart(copy)
                                .then(r => {
                                    clientApi.getUserCart()
                                        .then(r => {
                                            setUserCart(r[0]);
                                        })
                                })
                        }}
                    />

                    <textarea
                        className="container__item"
                        value={userCart.comment}
                        placeholder="Комментарий к заказу"
                        onChange={(e) => {
                            const copy = JSON.parse(JSON.stringify(userCart));
                            copy.comment = e.target.value;

                            const address = userAddresses?.find((add: DeliveryAddress) => add.delivery_address === copy.address) as DeliveryAddress;
                            copy.address = address.id

                            Object.assign(copy, { dishes_ordered: copy.dishes });
                            delete copy.dishes;
                            copy.dishes_ordered.forEach((d: any) => {
                                if (typeof d.dish === "string" && d.id) {
                                    d.dish = d.id
                                    delete d.id;
                                }
                            })

                            clientApi.updateUserCart(copy)
                                .then(r => {
                                    clientApi.getUserCart()
                                        .then(res => {
                                            setUserCart(res[0]);
                                        })
                                })
                        }}>
                    </textarea>

                    {user && <input
                        type="number"
                        id="input-scores"
                        className="container__item"
                        min={1}
                        max={user?.scores < userCart?.total_cost ? user?.scores : userCart?.total_cost}
                        value={scores4Pay ?? ""}
                        placeholder="Выберить количество баллов"
                        onChange={(e) => {
                            if (user) {
                                let inputed = Number.parseInt(e.target.value);
                                if (inputed < 0) inputed = 0;
                                if (inputed > user.scores) inputed = user.scores;
                                setScores4Pay(inputed);
                            }
                        }}
                    />}

                    <div style={{ display: "flex", justifyContent: "space-between", width: "90%", margin: "10px auto", height: "50px" }}>
                        <button
                            onClick={() => setPayType("cash")}
                            className={payType === "cash" ? "selected-pay-type" : "not-select"}
                            style={{
                                width: "49%",
                                fontSize: "20px",
                                backgroundColor: "white",
                                color: "black",
                                border: "none",
                                borderRadius: "10px",
                                boxShadow: "5px 5px 10px rgba(0, 0, 0, 0.25)",
                                transition: "all .3s ease-in-out"
                            }}
                        >Наличными курьеру</button>
                        <button
                            onClick={() => setPayType("sfp")}
                            className={payType === "sfp" ? "selected-pay-type" : "not-select"}
                            style={{
                                width: "49%",
                                fontSize: "20px",
                                backgroundColor: "white",
                                color: "black",
                                border: "none",
                                borderRadius: "10px",
                                boxShadow: "5px 5px 10px rgba(0, 0, 0, 0.25)",
                                transition: "all .3s ease-in-out"
                            }}
                        >По СБП</button>
                    </div>
                    <button
                        className="button-dark hover-button"
                        style={{ width: "90%", margin: "10px auto", height: "50px", fontSize: "20px" }}
                        onClick={() => {
                            if (payType === "sfp") approvePayRef.current?.showModal()
                            else if (userCart) {
                                const copy = JSON.parse(JSON.stringify(userCart));
                                copy.status = "awaiting_courier";

                                const address = userAddresses?.find((add: DeliveryAddress) => add.delivery_address === copy.address) as DeliveryAddress;
                                copy.address = address.id

                                Object.assign(copy, { dishes_ordered: copy.dishes });
                                delete copy.dishes;
                                copy.dishes_ordered.forEach((d: any) => {
                                    if (typeof d.dish === "string" && d.id) {
                                        d.dish = d.id
                                        delete d.id;
                                    }
                                })

                                if (scores4Pay) {
                                    const userCopy = JSON.parse(JSON.stringify(user)) as User;
                                    userCopy.scores += Math.round((userCart.total_cost - scores4Pay) / 10) - scores4Pay;
                                    mainApi.editUserInfo(userCopy)
                                }

                                clientApi.updateUserCart(copy)
                                    .then(r => {
                                        clientApi.getUserCart()
                                            .then(r => {
                                                setUserCart(r[0]);
                                                approvePayRef.current?.close();
                                            })
                                    })
                            }
                        }}
                    >Оформить</button>
                </div>
                <div className="main-cintent__list-legend">
                    <p className="list-legend__item--no-color">У вас есть {user?.scores} баллов</p>
                </div>
            </> : <>
                <div
                    className="main-content__user-cart"
                    style={{
                        backgroundColor: "white",
                        width: "fit-content",
                        margin: "0 auto",
                        padding: "30px",
                        fontSize: "24px",
                        borderRadius: "10px"
                    }}
                >
                    <p>Корзина пока что пуста</p>
                </div>
            </>
            }
        </>
        if (selectedPage === "allActiveOrders") return <>
            {activeUserCarts
                && activeUserCarts.length > 0
                ? activeUserCarts.map(cart => {
                    return <>
                        <div className="main-content__user-cart">
                            <div className="user-cart__container">
                                <div className="dishes__header--history">
                                    <p>Заказ на {convertDateTime(cart.delivery_time, true)}</p>
                                    <p className="header__status--history">{convertOrderStatus[cart.status as keyof typeof convertOrderStatus].slice(0, 1).toUpperCase() + convertOrderStatus[cart.status as keyof typeof convertOrderStatus].slice(1)}</p>
                                </div>
                                <p style={{
                                    fontSize: "20px",
                                    margin: "10px auto 15px 50px"
                                }}>Всего блюд - {cart.count_dishes}шт.</p>
                                {cart.dishes.map(dish => {
                                    return <div className="dishes__dish-item--history">
                                        <DishImg
                                            key={dish.dish}
                                            className="dish-item__img--user-cart"
                                            img={() => (dishesContainer?.find(d => d.id === dish.id)?.image as string) ?? null}
                                            onClick={() => { }}
                                        />
                                        <p style={{ marginLeft: "10px", }}>{dish.dish}</p>
                                        <p style={{ marginLeft: "10px", }}>{dish.quantity}</p>
                                        <p>{getDishTotalCostById(dish.id, dish.quantity)}руб.</p>
                                    </div>
                                })}

                                <div style={{ display: "flex", justifyContent: "space-between", margin: "20px 50px 10px", fontSize: "20px" }}>
                                    <p>Итого:</p>
                                    <p>{cart.total_cost}руб. за {cart.count_dishes} блюд</p>
                                </div>

                                <p className="user-cart__address">{cart.address ? cart.address : "! Адрес не указан !"}</p>

                                <div className="container__buttons-container">
                                    <button
                                        className="buttons-container__button button-dark hover-button"
                                        onClick={() => {
                                            clientApi.updateActiveCart(cart.id, 'delivered')
                                                .then(r => {
                                                    clientApi.getActiveCart()
                                                        .then(r => {
                                                            setActiveUserCarts(r);
                                                        })

                                                    clientApi.getOrdersHistory()
                                                        .then(r => {
                                                            setUserOrdersHistory(r);
                                                        })
                                                })
                                        }}
                                    >Доставлен</button>
                                    <button
                                        className="buttons-container__button button-dark hover-button"
                                        onClick={() => {
                                            showApproveModal({
                                                text: "отменить заказ",
                                                subText: "Деньги будут возвращены в течении 3 рабочих дней!",
                                                resolve: () => {
                                                    clientApi.updateActiveCart(cart.id, 'cancelled')
                                                        .then(r => {
                                                            clientApi.getActiveCart()
                                                                .then(r => {
                                                                    setActiveUserCarts(r);
                                                                })

                                                            clientApi.getOrdersHistory()
                                                                .then(r => {
                                                                    setUserOrdersHistory(r);
                                                                })
                                                        })
                                                    showApproveModal(null);
                                                },
                                                reject: () => showApproveModal(null)
                                            })
                                        }}> Отменить</button>
                                </div>
                            </div>
                        </div >
                    </>
                })
                : <>
                    <div
                        className="main-content__user-cart"
                        style={{
                            backgroundColor: "white",
                            width: "fit-content",
                            margin: "0 auto",
                            padding: "30px",
                            fontSize: "24px",
                            borderRadius: "10px"
                        }}
                    >
                        <p>Заказов ещё не было, но никогда не поздно начать!</p>
                    </div>
                </>}
        </>
        if (selectedPage === 'allOrders') return <>
            {userOrdersHistory
                && userOrdersHistory.length > 0
                ?
                <>
                    {userOrdersHistory.map(cart => {
                        return <>
                            <div className="main-content__user-cart">
                                <div className="user-cart__container">
                                    <div className="dishes__header--history">
                                        <p>Заказ на {convertDateTime(cart.delivery_time, true)}</p>
                                        <p className="header__status--history">{convertOrderStatus[cart.status as keyof typeof convertOrderStatus].slice(0, 1).toUpperCase() + convertOrderStatus[cart.status as keyof typeof convertOrderStatus].slice(1)}</p>
                                    </div>
                                    <p style={{
                                        fontSize: "20px",
                                        margin: "10px auto 15px 50px"
                                    }}>Всего блюд - {cart.count_dishes}шт.</p>
                                    {cart.dishes.map(dish => {
                                        return <div className="dishes__dish-item--history">
                                            <DishImg
                                                key={dish.dish}
                                                className="dish-item__img--user-cart"
                                                img={() => (dishesContainer?.find(d => d.id === dish.id)?.image as string) ?? null}
                                                onClick={() => { }}
                                            />
                                            <p style={{ marginLeft: "10px", }}>{dish.dish}</p>
                                            <p style={{ marginLeft: "10px", }}>{dish.quantity}</p>
                                            <p>{getDishTotalCostById(dish.id, dish.quantity)}руб.</p>
                                        </div>
                                    })}

                                    <div style={{ display: "flex", justifyContent: "space-between", margin: "20px 50px 10px", fontSize: "20px" }}>
                                        <p>Итого:</p>
                                        <p>{cart.total_cost}руб. за {cart.count_dishes} блюд</p>
                                    </div>

                                    <p className="user-cart__address">{cart.address ? cart.address : "! Адрес не указан !"}</p>
                                </div>
                            </div >
                        </>
                    })}
                </>
                :
                <>
                    <div
                        className="main-content__user-cart"
                        style={{
                            backgroundColor: "white",
                            width: "fit-content",
                            margin: "0 auto",
                            padding: "30px",
                            fontSize: "24px",
                            borderRadius: "10px"
                        }}
                    >
                        <p>Заказов ещё не было, но никогда не поздно начать!</p>
                    </div>
                </>
            }
        </>
    }

    const renderCourierPages = () => {
        if (selectedPage === 'updData') return <>
            {editUser
                && <>
                    <div className="main-content__edit-user-info">
                        <div className="edit-user-info__form-item">
                            <input
                                type="text"
                                className="create-login-form__input input-login"
                                value={editUser.username}
                                onChange={(e) => changeValue("username", e.target.value, 'edit')}
                                placeholder="Логин"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <input
                                type="email"
                                className="edit-user-info__input input-email"
                                value={editUser.email}
                                onChange={(e) => changeValue("email", e.target.value, 'edit')}
                                placeholder="Почта"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <input
                                type="text"
                                className="edit-user-info__input input-phone"
                                value={editUser.phone}
                                onChange={(e) => changeValue("phone", e.target.value, 'edit')}
                                placeholder="Телефон"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <input
                                type="text"
                                className="edit-user-info__input input-password"
                                value={userRegisterPass}
                                onChange={(e) => setUserRegisterPass(e.target.value)}
                                placeholder="Предыдуший пароль"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <input
                                type="text"
                                className="edit-user-info__input input-password"
                                value={userLoginPass}
                                onChange={(e) => setUserLoginPass(e.target.value)}
                                placeholder="Новый пароль"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <input
                                type="text"
                                className="edit-user-info__input input-password"
                                value={tmpPass}
                                onChange={(e) => setTmpPass(e.target.value)}
                                placeholder="Повторите пароль"
                            />
                        </div>
                        <button
                            disabled={
                                userRegisterPass.length === 0
                                || userLoginPass.length === 0
                                || userLoginPass !== tmpPass
                                || !validateForm(editUser)
                                || !validateData(userLoginPass, "password")
                            }
                            className="edit-user-info__button-submit button-dark hover-button"
                            onClick={() => {
                                if (editUser) {
                                    const mainApi = new MainApi();
                                    const copy = JSON.parse(JSON.stringify(editUser))
                                    Object.assign(copy, { "old_password": userRegisterPass, "new_password": userLoginPass });
                                    setTmpPass("");
                                    setUserLoginPass("");
                                    setUserRegisterPass("");
                                    mainApi.editUserInfo(copy)
                                        .then(r => {
                                            const tmp = JSON.parse(JSON.stringify(editUser));
                                            delete tmp.id;
                                            if (Object.keys(tmp).every(key => Object.keys(r).includes(key))) {
                                                alert('Данные успешно обновлены!')
                                            }
                                            else {
                                                alert(Object.keys(r).map(key => r[key]).join('\n'))
                                            }
                                        })
                                }
                            }}>
                            Обновить данные
                        </button>
                    </div>
                </>
            }
        </>
        if (selectedPage === 'currOrder') return <>
            <div className="courier-order">
                <div className="orders-count">Всего - {courierActiveOrders ? courierActiveOrders.length : 0}шт. </div>
                {courierActiveOrders ? courierActiveOrders.map(order => {
                    return <div className="cart-container__left-cart--courier">
                        <span
                            style={{ cursor: "pointer" }}
                            onClick={() => setModalData({ title: `Информация о заказе №${order.id}`, body: "order4courier", forBody: order })}
                        >Заказ №{order.id} к {convertDateTime(order.delivery_time, true)}</span>
                        <span>{order.address ? order.address.address : ""}</span>
                        <span
                            style={{ cursor: "pointer" }}
                            onClick={() => setModalData({ title: "Информация о клиенте", body: "client4courier", forBody: order.user })}
                        >{order.user ? order.user.username : ""}</span>
                        <span>Всего блюд: {order.count_dishes}шт.</span>
                    </div>
                }) : <>
                    <div
                        className="main-content__user-cart"
                        style={{
                            backgroundColor: "white",
                            width: "fit-content",
                            margin: "0 auto",
                            padding: "30px",
                            fontSize: "24px",
                            borderRadius: "10px"
                        }}
                    >
                        <p>Вот-вот поступит новый заказ!</p>
                    </div>
                </>}
            </div>
        </>
        if (selectedPage === 'allOrders') return <>
            <div className="courier-order">
                <div className="orders-count">Всего - {courierHistory ? courierHistory.length : 0}шт. </div>
                {courierHistory ? courierHistory.map(order => {
                    return <div className="cart-container__left-cart--courier">
                        <span
                            style={{ cursor: "pointer" }}
                            onClick={() => setModalData({ title: `Информация о заказе №${order.id}`, body: "order4courier", forBody: order })}
                        >Заказ №{order.id} к {convertDateTime(order.delivery_time, true)}</span>
                        <span>{order.address ? order.address.address : ""}</span>
                        <span
                            style={{ cursor: "pointer" }}
                            onClick={() => setModalData({ title: "Информация о клиенте", body: "client4courier", forBody: order.user })}
                        >{order.user ? order.user.username : ""}</span>
                        <span>Всего блюд: {order.count_dishes}шт.</span>
                    </div>
                }) : <>
                    <div
                        className="main-content__user-cart"
                        style={{
                            backgroundColor: "white",
                            width: "fit-content",
                            margin: "0 auto",
                            padding: "30px",
                            fontSize: "24px",
                            borderRadius: "10px"
                        }}
                    >
                        <p>История пока пуста, но всё только впереди!</p>
                    </div>
                </>}
            </div>
        </>
    }

    const renderManagerPages = () => {
        if (selectedPage === 'updData') return <>
            {editUser && <div className="main-content__edit-user-info">
                <div className="edit-user-info__form-item">
                    <input
                        type="text"
                        className="create-login-form__input input-login"
                        value={editUser.username}
                        onChange={(e) => changeValue("username", e.target.value, 'edit')}
                        placeholder="Логин"
                    />
                </div>
                <div className="edit-user-info__form-item">
                    <input
                        type="email"
                        className="edit-user-info__input input-email"
                        value={editUser.email}
                        onChange={(e) => changeValue("email", e.target.value, 'edit')}
                        placeholder="Почта"
                    />
                </div>
                <div className="edit-user-info__form-item">
                    <input
                        type="text"
                        className="edit-user-info__input input-phone"
                        value={editUser.phone}
                        onChange={(e) => changeValue("phone", e.target.value, 'edit')}
                        placeholder="Телефон"
                    />
                </div>
                <div className="edit-user-info__form-item">
                    <input
                        type="text"
                        className="edit-user-info__input input-password"
                        value={userRegisterPass}
                        onChange={(e) => setUserRegisterPass(e.target.value)}
                        placeholder="Предыдуший пароль"
                    />
                </div>
                <div className="edit-user-info__form-item">
                    <input
                        type="text"
                        className="edit-user-info__input input-password"
                        value={userLoginPass}
                        onChange={(e) => setUserLoginPass(e.target.value)}
                        placeholder="Новый пароль"
                    />
                </div>
                <div className="edit-user-info__form-item">
                    <input
                        type="text"
                        className="edit-user-info__input input-password"
                        value={tmpPass}
                        onChange={(e) => setTmpPass(e.target.value)}
                        placeholder="Повторите пароль"
                    />
                </div>
                <button
                    disabled={
                        userRegisterPass.length === 0
                        || userLoginPass.length === 0
                        || userLoginPass !== tmpPass
                        || !validateForm(editUser)
                        || !validateData(userLoginPass, "password")
                    }
                    className="edit-user-info__button-submit button-dark hover-button"
                    onClick={() => {
                        if (editUser) {
                            const mainApi = new MainApi();
                            const copy = JSON.parse(JSON.stringify(editUser))
                            Object.assign(copy, { "old_password": userRegisterPass, "new_password": userLoginPass });
                            setTmpPass("");
                            setUserLoginPass("");
                            setUserRegisterPass("");
                            mainApi.editUserInfo(copy)
                                .then(r => {
                                    const tmp = JSON.parse(JSON.stringify(editUser));
                                    delete tmp.id;
                                    if (Object.keys(tmp).every(key => Object.keys(r).includes(key))) {
                                        alert('Данные успешно обновлены!')
                                    }
                                    else {
                                        alert(Object.keys(r).map(key => r[key]).join('\n'))
                                    }
                                })
                        }
                    }}>
                    Обновить данные
                </button>
            </div>}
        </>
        if (selectedPage === 'allActiveOrders' && allOrders) {
            const orders2Show = sortByStatus !== 0 ? allOrders.sort(sortByStatusFoo) : allOrders;

            return <>

                <div style={{ display: "flex" }}>
                    <div className="main-content__list-container" style={{ marginTop: 0 }}>
                        <div className="list-container__sort-panel" key={sortByStatus}>
                            <div className="sort-panel__item">
                                <p className="circle-before--light">Ожидают курьера - {orders2Show.filter(o => o.status === "awaiting_courier").length}шт.</p>
                            </div>

                            <div className="sort-panel__item">
                                <p className="circle-before--dark">Доставляются - {orders2Show.filter(o => o.status === "deliver").length}шт.</p>
                            </div>

                            <div className="sort-panel__item">
                                <button className="sort-panel__button hover-button" onClick={() => {
                                    if (sortByStatus === -1) setSortByStatus(0);
                                    else if (sortByStatus === 0) setSortByStatus(1);
                                    else if (sortByStatus === 1) setSortByStatus(-1);
                                }}>{sortByStatus === -1 ? "↓" : (sortByStatus === 1 ? "↑" : '↑↓')}</button>
                            </div>
                        </div>
                        {orders2Show && orders2Show.length > 0 ? orders2Show.filter(o => o.status === "awaiting_courier" || o.status === "deliver").map(order => {
                            return <>
                                <div className={`cart-container__left-cart--courier${order.status === "deliver" ? "--dark" : ""}`} style={{ gridTemplateColumns: "25% 35% 20% 20%" }}>
                                    <span
                                        style={{ cursor: "pointer" }}
                                        onClick={() => setModalData({ title: `Информация о заказе №${order.id}`, body: "order4manager", forBody: order })}
                                    >Заказ №{order.id} к {convertDateTime(order.delivery_time, true)}</span>
                                    <span>{order.address ? order.address.address : ""}</span>
                                    <span
                                        style={{ cursor: "pointer" }}
                                        onClick={() => setModalData({ title: "Информация о клиенте", body: "client4courier", forBody: order.user })}
                                    >Клиент: {order.user ? order.user.username : ""}</span>
                                    <span
                                        style={{ cursor: "pointer" }}
                                        onClick={() => setModalData({
                                            title: "Информация о курьере", body: "courier4manager", forBody: {
                                                ...order.courier,
                                                courierOrders: allOrders ? allOrders?.filter(o => o.courier && order.courier && order.courier.id === o.courier.id) : []
                                            }
                                        })}
                                    >Курьер: {order.courier ? order.courier.username : ""}</span>
                                </div>
                            </>
                        }) : <>
                            <div
                                className="main-content__user-cart"
                                style={{
                                    backgroundColor: "white",
                                    width: "fit-content",
                                    margin: "0 auto",
                                    padding: "30px",
                                    fontSize: "24px",
                                    borderRadius: "10px"
                                }}
                            >
                                <p>Вот-вот поступит новый заказ!</p>
                            </div>
                        </>}
                    </div>
                </div>
            </>
        }
        if (selectedPage === 'allPrevOrders' && allOrders) {
            const orders2Show = sortByStatus !== 0 ? allOrders.sort(sortByStatusFoo) : allOrders;

            return <>

                <div style={{ display: "flex" }}>
                    <div className="main-content__list-container" style={{ marginTop: 0 }}>
                        <div className="list-container__sort-panel" key={sortByStatus}>
                            <div className="sort-panel__item">
                                <p className="circle-before--light">Доставлено - {orders2Show.filter(o => o.status === "delivered").length}шт.</p>
                            </div>

                            <div className="sort-panel__item">
                                <p className="circle-before--dark">Отменено - {orders2Show.filter(o => o.status === "cancelled").length}шт.</p>
                            </div>

                            <div className="sort-panel__item">
                                <button className="sort-panel__button hover-button" onClick={() => {
                                    if (sortByStatus === -1) setSortByStatus(0);
                                    else if (sortByStatus === 0) setSortByStatus(1);
                                    else if (sortByStatus === 1) setSortByStatus(-1);
                                }}>{sortByStatus === -1 ? "↓" : (sortByStatus === 1 ? "↑" : '↑↓')}</button>
                            </div>
                        </div>
                        {orders2Show && orders2Show.length > 0 ? orders2Show.filter(o => o.status === "delivered" || o.status === "cancelled").map(order => {
                            return <>
                                <div className={`cart-container__left-cart--courier${order.status === "cancelled" ? "--dark" : ""}`} style={{ gridTemplateColumns: "25% 35% 20% 20%" }}>
                                    <span
                                        style={{ cursor: "pointer" }}
                                        onClick={() => setModalData({ title: `Информация о заказе №${order.id}`, body: "prevOrder4manager", forBody: order })}
                                    >Заказ №{order.id} к {convertDateTime(order.delivery_time, true)}</span>
                                    <span>{order.address ? order.address.address : ""}</span>
                                    <span
                                        style={{ cursor: "pointer" }}
                                        onClick={() => setModalData({ title: "Информация о клиенте", body: "client4courier", forBody: order.user })}
                                    >Клиент: {order.user ? order.user.username : ""}</span>
                                    <span
                                        style={{ cursor: "pointer" }}
                                        onClick={() => setModalData({
                                            title: "Информация о курьере", body: "courier4manager", forBody: {
                                                ...order.courier,
                                                courierOrders: allOrders ? allOrders?.filter(o => o.courier && order.courier && order.courier.id === o.courier.id) : []
                                            }
                                        })}
                                    >Курьер: {order.courier ? order.courier.username : ""}</span>
                                </div>
                            </>
                        }) : <>
                            <div
                                className="main-content__user-cart"
                                style={{
                                    backgroundColor: "white",
                                    width: "fit-content",
                                    margin: "0 auto",
                                    padding: "30px",
                                    fontSize: "24px",
                                    borderRadius: "10px"
                                }}
                            >
                                <p>История пока пуста!</p>
                            </div>
                        </>}
                    </div>
                </div>
            </>
        }
        if (selectedPage === 'allCouriers' && allCouriers) {
            const couriers2Show = sortByCount !== 0 ? allCouriers.sort(sortByCountFoo) : allCouriers;

            return <>
                <div className="main-content__list-container" style={{ margin: "20px auto 0", height: "auto" }}>
                    <div className="list-container__sort-panel" key={sortByCount} style={{ marginBottom: "20px" }}>
                        <div className="sort-panel__item">
                            <p>Всего - {couriers2Show.length} человек</p>
                        </div>

                        <div className="sort-panel__item">
                            <p>Свободных - {couriers2Show.filter(c => allOrders ? allOrders?.filter(order => order.courier && order.courier.id === c.id).length === 0 : true).length} человек</p>
                        </div>

                        <div className="sort-panel__item">
                            <button className="sort-panel__button hover-button" onClick={() => {
                                if (sortByCount === -1) setSortByCount(0);
                                else if (sortByCount === 0) setSortByCount(1);
                                else if (sortByCount === 1) setSortByCount(-1);
                            }}>{sortByCount === -1 ? "↓" : (sortByCount === 1 ? "↑" : '↑↓')}</button>
                        </div>
                    </div>
                    {couriers2Show.map(courier => {
                        const courierOrders = allOrders ? allOrders?.filter(order => order.courier && order.courier.id === courier.id) : []
                        return <>
                            <div className="couriers-list__item">
                                <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                                    <p style={{ margin: 0, cursor: "pointer" }} onClick={() => setModalData({
                                        title: "Информация о курьере", body: "courier4manager", forBody: {
                                            ...courier,
                                            courierOrders: allOrders ? allOrders?.filter(o => o.courier && courier && courier.id === o.courier.id) : []
                                        }
                                    })}>{courier.id} - {courier.username}</p>
                                    <p style={{ margin: 0 }}>Всего заказов - {courierOrders.length} шт.</p>
                                </div>
                                <div style={{ flex: 4, maxHeight: "100%", overflow: "auto" }}>
                                    {courierOrders.map(order => {
                                        return <div
                                            onClick={() => setModalData({ title: `Информация о заказе №${order.id}`, body: "order4manager", forBody: order })}
                                            style={{
                                                cursor: "pointer",
                                                display: "grid",
                                                gridTemplateColumns: "repeat(2, 50%)",
                                                justifyItems: "center",
                                                width: "80%",
                                                margin: "0 0 16px auto"
                                            }}>
                                            <p style={{ margin: 0 }}>Заказ №{order.id} к {convertDateTime(order.delivery_time, true)}</p>
                                            <p style={{ margin: 0 }}>{order.address ? order.address.address : ""}</p>
                                        </div>
                                    })}
                                </div>
                            </div>
                        </>
                    })}
                </div>
            </>
        }
    }

    return <>
        <div className="user-page">

            {user && user.id !== -1 && <Header user={user} onLogout={() => {
                setUser(null);
                setUserLogin(defaultUser);
                document.cookie = `sessionToken=`
            }} />}

            {userLogin?.id !== -1 &&
                <div className="user-page__nav-bar">
                    <div className="user-page__nav-bar__container">
                        {userLogin?.role === 'client'
                            &&
                            <>
                                <button className={"nav-bar__nav-item" + (selectedPage === "updData" ? " selected" : "")} onClick={() => setSelectedPage('updData')}>Изменить личные данные</button>
                                <button className={"nav-bar__nav-item" + (selectedPage === "currOrder" ? " selected" : "")} onClick={() => setSelectedPage('currOrder')}>Текущий заказ</button>
                                <button className={"nav-bar__nav-item" + (selectedPage === "allActiveOrders" ? " selected" : "")} onClick={() => setSelectedPage('allActiveOrders')}>Активные заказы</button>
                                <button className={"nav-bar__nav-item" + (selectedPage === "allOrders" ? " selected" : "")} onClick={() => setSelectedPage('allOrders')}>История заказов</button>
                            </>
                        }
                        {userLogin?.role === 'courier'
                            &&
                            <>
                                <button className={"nav-bar__nav-item" + (selectedPage === "updData" ? " selected" : "")} onClick={() => setSelectedPage('updData')}>Изменить личные данные</button>
                                <button className={"nav-bar__nav-item" + (selectedPage === "currOrder" ? " selected" : "")} onClick={() => setSelectedPage('currOrder')}>Активный заказ</button>
                                <button className={"nav-bar__nav-item" + (selectedPage === "allOrders" ? " selected" : "")} onClick={() => setSelectedPage('allOrders')}>Список доставленных заказов</button>
                            </>
                        }
                        {userLogin?.role === 'manager'
                            &&
                            <>
                                <button className={"nav-bar__nav-item" + (selectedPage === "updData" ? " selected" : "")} onClick={() => setSelectedPage('updData')}>Изменить личные данные</button>
                                <button className={"nav-bar__nav-item" + (selectedPage === "allActiveOrders" ? " selected" : "")} onClick={() => setSelectedPage('allActiveOrders')}>Активные заказы</button>
                                <button className={"nav-bar__nav-item" + (selectedPage === "allPrevOrders" ? " selected" : "")} onClick={() => setSelectedPage('allPrevOrders')}>Прошлые заказы</button>
                                <button className={"nav-bar__nav-item" + (selectedPage === "allCouriers" ? " selected" : "")} onClick={() => setSelectedPage('allCouriers')}>Курьеры</button>
                            </>
                        }
                    </div>
                </div>
            }

            <div className={user?.id === -1 ? "user-page__main-content--login" : "user-page__main-content"}>

                {userLogin
                    && userLogin?.id === -1
                    && userRegister
                    ? <>
                        <div className="main-content__forms-container">
                            {isLogin
                                ? <div className="forms-container__login-form">
                                    <h4 className="create-login-form__form-title ">
                                        <a href="/"><img src={Logo} alt="logo" className="form-title__img" /></a>
                                        Заполните форму для авторизации
                                    </h4>
                                    <div className="login-form__form-item">
                                        <input
                                            type="email"
                                            className="create-login-form__input input-email"
                                            value={userLogin.email}
                                            onChange={(e) => changeValue("email", e.target.value, 'login')}
                                            placeholder="Почта"
                                        />
                                    </div>
                                    <div className="login-form__form-item">
                                        <input
                                            type="password"
                                            className="create-login-form__input input-passwd"
                                            value={userLoginPass}
                                            onChange={(e) => setUserLoginPass(e.target.value)}
                                            placeholder="Пароль"
                                        />
                                    </div>
                                    <button
                                        className="login-form__button-submit button-dark hover-button"
                                        disabled={!userLogin.email || !userLoginPass}
                                        style={{ width: "450px", margin: "0 auto" }}
                                        onClick={() => {
                                            const mainApi = new MainApi();
                                            mainApi.authUser(userLogin, userLoginPass)
                                                .then(async (r) => {
                                                    let res = await mainApi.getUserInfo();
                                                    if (!res.detail) {
                                                        setUserLogin(res as User);
                                                        setUser(res as User);
                                                        setUserLoginPass("");
                                                        setSelectedPage('currOrder')
                                                    }
                                                })
                                        }}>
                                        Войти
                                    </button>
                                    <p style={{ cursor: "pointer", width: "fit-content", margin: "10px auto 0" }} onClick={() => setIsLogin(false)}>Нет аккаунта?</p>
                                </div>
                                : <div className="forms-container__create-login-form">
                                    <h4 className="create-login-form__form-title">
                                        <a href="/"><img src={Logo} alt="logo" className="form-title__img" /></a>
                                        Заполните форму для регистрации
                                    </h4>
                                    <div className="create-login-form__form-item">
                                        <input
                                            type="text"
                                            className="create-login-form__input input-login"
                                            value={userRegister.username}
                                            onChange={(e) => changeValue("username", e.target.value, 'register')}
                                            placeholder="Логин"
                                        />
                                    </div>
                                    <div className="create-login-form__form-item">
                                        <input
                                            type="email"
                                            className="create-login-form__input input-email"
                                            value={userRegister.email}
                                            onChange={(e) => changeValue("email", e.target.value, 'register')}
                                            placeholder="Почта"
                                        />
                                    </div>
                                    <div className="create-login-form__form-item">
                                        <input
                                            type="text"
                                            className="create-login-form__input input-phone"
                                            value={userRegister.phone}
                                            onChange={(e) => changeValue("phone", e.target.value, 'register')}
                                            placeholder="Телефон"
                                        />
                                    </div>
                                    <div className="create-login-form__form-item">
                                        <input
                                            type="password"
                                            className="create-login-form__input input-passwd"
                                            value={userRegisterPass}
                                            onChange={(e) => setUserRegisterPass(e.target.value)}
                                            placeholder="Пароль"
                                        />
                                    </div>
                                    <div className="create-login-form__form-item">
                                        <input
                                            type="password"
                                            className="create-login-form__input input-passwd"
                                            value={tmpPass}
                                            onChange={(e) => setTmpPass(e.target.value)}
                                            placeholder=" Повторите пароль"
                                        />
                                    </div>
                                    <button
                                        className="create-login-form__button-submit button-dark hover-button"
                                        style={{ width: "450px", margin: "0 auto" }}
                                        disabled={
                                            !userRegister.email
                                            || !userRegisterPass
                                            || !validateForm(userRegister)
                                            || !validateData(userRegisterPass, "password")
                                        }
                                        onClick={() => {
                                            const mainApi = new MainApi();
                                            mainApi.createUser(userRegister, userRegisterPass)
                                                .then(async (r) => {
                                                    let res = await mainApi.getUserInfo();
                                                    if (!res.detail) {
                                                        setUserLogin(res as User);
                                                        setUser(res as User);
                                                        setUserLoginPass("");
                                                        setSelectedPage('currOrder')
                                                        setUserRegister(defaultUser);
                                                    }
                                                })
                                        }}>
                                        Зарегистрироваться
                                    </button>
                                    <p style={{ cursor: "pointer", width: "fit-content", margin: "10px auto 0" }} onClick={() => setIsLogin(true)}>Уже есть аккаунт?</p>
                                </div>}
                        </div>
                    </>
                    :
                    <>
                        <dialog ref={helpModalRef} className='approve-modal'>
                            <button className="close-modal-button" onClick={() => setModalData(null)} />
                            {modalData
                                && <>
                                    <p className="approve-modal__title">{modalData.title}</p>
                                    <div className="approve-modal__container--modify">
                                        {modalData.body === "newAddress"
                                            && <>
                                                <input
                                                    value={newAddress?.delivery_address}
                                                    placeholder="Введите новый адрес доставки"
                                                    style={{ width: "100%" }}
                                                    onChange={(e) => {
                                                        const copy = JSON.parse(JSON.stringify(newAddress)) as DeliveryAddress;
                                                        copy.delivery_address = e.target.value;
                                                        setNewAddress(copy);
                                                    }} />
                                                <div style={{ display: "flex", width: "100%", justifyContent: "space-around" }}>
                                                    <label htmlFor="wannaDefault">Хотите выбрать его адресом по умолчанию?</label>
                                                    <div
                                                        id="wannaDefault"
                                                        className={`switch-btn${newAddress && newAddress.is_default ? " switch-on" : ""}`}
                                                        onClick={() => {
                                                            const copy = JSON.parse(JSON.stringify(newAddress)) as DeliveryAddress;
                                                            copy.is_default = !newAddress?.is_default;
                                                            setNewAddress(copy);
                                                        }}
                                                    />
                                                </div>
                                                <div className="container__buttons-container" style={{ width: "auto", margin: "0" }}>
                                                    <button
                                                        style={{ width: "200px" }}
                                                        className="buttons-container__reject button-dark hover-button"
                                                        onClick={() => setModalData(null)}
                                                    >Назад</button>
                                                    <button
                                                        style={{ width: "200px" }}
                                                        className="buttons-container__resolve button-dark hover-button"
                                                        onClick={() => {
                                                            if (newAddress && newAddress?.delivery_address !== "") {
                                                                clientApi.addDeliveryAddresses(newAddress)
                                                                    .then(r => {
                                                                        clientApi.getDeliveryAddresses()
                                                                            .then(r => {
                                                                                setUserAddresses(r)
                                                                                setNewAddress({
                                                                                    is_default: false,
                                                                                    delivery_address: "",
                                                                                    id: 0
                                                                                })
                                                                                setModalData(null);
                                                                            })
                                                                    })
                                                            }
                                                        }}>
                                                        Добавить новый адрес</button>
                                                </div>
                                            </>}
                                        {modalData.body === "aboutScores"
                                            && <>
                                                <p style={{ margin: "0" }}>Вы получаете баллы за каждую совершенную покупку в размере 10% от итоговой суммы заказа.<br /><br />1 балл равняется 1 рублю при оплате любого заказа.</p>
                                                <div className="container__buttons-container" style={{ margin: "30px auto 0" }}>
                                                    <button
                                                        style={{ width: "420px" }}
                                                        className="buttons-container__resolve button-dark hover-button"
                                                        onClick={() => setModalData(null)}
                                                    >
                                                        Отлично!
                                                    </button>
                                                </div>
                                            </>}
                                        {modalData.body === "order4courier"
                                            && <>
                                                {modalData.forBody && <>
                                                    <label htmlFor="dateTime">Время и дата</label>
                                                    <p className="value">{convertDateTime((modalData.forBody as OrderForWorker).delivery_time, true)}</p>

                                                    <label htmlFor="address">Адресс доставки</label>
                                                    <p className="value">{(modalData.forBody as OrderForWorker).address ? (modalData.forBody as OrderForWorker).address.address : ""}</p>

                                                    <label htmlFor="status">Статус</label>
                                                    <p className="value">{convertOrderStatus[(modalData.forBody as OrderForWorker).status]}</p>

                                                    <label>Клиент</label>
                                                    <div style={{ width: "100%", display: "flex", justifyContent: "space-evenly" }}>
                                                        <p className="value">{(modalData.forBody as OrderForWorker).user ? (modalData.forBody as OrderForWorker).user.username : ""}</p>
                                                        <button
                                                            className="hover-button"
                                                            style={{
                                                                backgroundImage: `url(${InfoIcon})`,
                                                                backgroundSize: "contain",
                                                                backgroundPosition: "center",
                                                                backgroundRepeat: "no-repeat",
                                                                border: "none",
                                                                width: "25px",
                                                                aspectRatio: 1,
                                                                marginLeft: "15px",
                                                            }}
                                                            onClick={() => (modalData.forBody as OrderForWorker).user && setModalData({ title: "Информация о клиенте", body: "client4courier", forBody: (modalData.forBody as OrderForWorker).user })}
                                                        />
                                                    </div>

                                                    <label>Блюда</label>
                                                    {(modalData.forBody as OrderForWorker).orderdish_set.map(dish => {
                                                        return <div style={{ width: "100%", display: "grid", gridTemplateColumns: "60% repeat(2, 20%)", justifyItems: "start" }}>
                                                            <p>{dish.dish}</p>
                                                            <p>{dish.quantity}шт.</p>
                                                            <p>{getDishTotalCostById(dish.id, dish.quantity)}руб.</p>
                                                        </div>
                                                    })}
                                                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                                                        <p>Итого:</p>
                                                        <p>{(modalData.forBody as OrderForWorker).total_cost}руб. за {(modalData.forBody as OrderForWorker).count_dishes} блюд</p>
                                                    </div>

                                                    <label>Комментарий</label>
                                                    <p className="value" style={{ height: "fit-content", maxHeight: "100px", overflow: "auto" }}>{(modalData.forBody as OrderForWorker).comment ?? ""}</p>
                                                </>}

                                                <div className="container__buttons-container" style={{ margin: "30px auto 0" }}>
                                                    <button
                                                        style={{ width: "420px" }}
                                                        className="buttons-container__resolve button-dark hover-button"
                                                        onClick={() => setModalData(null)}
                                                    >
                                                        Назад
                                                    </button>
                                                </div>
                                            </>}
                                        {modalData.body === "client4courier"
                                            && <>
                                                {modalData.forBody && <>
                                                    <label htmlFor="dateTime">Логин</label>
                                                    <p className="value">{(modalData.forBody as any).username ?? ""}</p>

                                                    <label htmlFor="address">Телефон</label>
                                                    <p className="value">{(modalData.forBody as any).phone ?? ""}</p>

                                                    <label htmlFor="email">Почта</label>
                                                    <p className="value">{(modalData.forBody as any).email ?? ""}</p>
                                                </>}

                                                <div className="container__buttons-container" style={{ margin: "30px auto 0" }}>
                                                    <button
                                                        style={{ width: "420px" }}
                                                        className="buttons-container__resolve button-dark hover-button"
                                                        onClick={() => setModalData(null)}
                                                    >
                                                        Назад
                                                    </button>
                                                </div>
                                            </>}
                                        {modalData.body === "order4manager"
                                            && <>
                                                {modalData.forBody && <>
                                                    <label htmlFor="dateTime">Время и дата</label>
                                                    <input
                                                        type="datetime-local"
                                                        className="value"
                                                        value={(modalData.forBody as OrderForWorker).delivery_time}
                                                        onChange={(e) => {
                                                            if (validateData(e.target.value, "datetime")) {
                                                                const copy = JSON.parse(JSON.stringify(modalData.forBody)) as OrderForWorker;
                                                                copy.delivery_time = e.target.value;
                                                                setModalData({
                                                                    title: modalData.title,
                                                                    body: modalData.body,
                                                                    forBody: copy
                                                                });
                                                            }
                                                        }}
                                                    />

                                                    <label htmlFor="address">Адресс доставки</label>
                                                    <p className="value">{(modalData.forBody as OrderForWorker).address ? (modalData.forBody as OrderForWorker).address.address : ""}</p>

                                                    <label htmlFor="status">Статус</label>
                                                    <p className="value">{convertOrderStatus[(modalData.forBody as OrderForWorker).status]}</p>

                                                    <label>Курьер</label>
                                                    <div style={{ width: "100%", display: "flex", justifyContent: "space-evenly" }}>
                                                        <select
                                                            className="value"
                                                            value={(modalData.forBody as OrderForWorker).courier ? `${(modalData.forBody as OrderForWorker).courier.id} - ${(modalData.forBody as OrderForWorker).courier.username}` : ""}
                                                            onChange={(e) => {
                                                                const courier = allCouriers?.find(c => c.id === Number(e.target.value.split(" - ")[0]));
                                                                if (courier) {
                                                                    const copy = JSON.parse(JSON.stringify(modalData.forBody)) as OrderForWorker;
                                                                    copy.courier = courier;
                                                                    setModalData({
                                                                        title: modalData.title,
                                                                        body: modalData.body,
                                                                        forBody: copy
                                                                    });
                                                                    managerApi.editOrder(copy)
                                                                        .then(r => {
                                                                            managerApi.getAllOrders()
                                                                                .then(res => {
                                                                                    setAllOrders(res.sort(sortByDeliveryTimeFoo))

                                                                                })
                                                                        })
                                                                }
                                                            }}
                                                        >
                                                            {allCouriers?.map(courier => {
                                                                return <option>{courier.id} - {courier.username}</option>
                                                            })}
                                                        </select>
                                                        {/* <p className="value">{(modalData.forBody as OrderForWorker).courier ? (modalData.forBody as OrderForWorker).courier.username : ""}</p> */}
                                                        <button
                                                            style={{
                                                                backgroundImage: `url(${InfoIcon})`,
                                                                backgroundSize: "contain",
                                                                backgroundPosition: "center",
                                                                backgroundRepeat: "no-repeat",
                                                                border: "none",
                                                                width: "25px",
                                                                aspectRatio: 1,
                                                                marginLeft: "15px",
                                                            }}
                                                            className="hover-button"
                                                            onClick={() => (modalData.forBody as OrderForWorker).courier
                                                                && setModalData({
                                                                    title: "Информация о курьере",
                                                                    body: "courier4manager",
                                                                    forBody: {
                                                                        ...(modalData.forBody as OrderForWorker).courier,
                                                                        courierOrders: allOrders ? allOrders?.filter(o => o.courier && (modalData.forBody as OrderForWorker).courier && (modalData.forBody as OrderForWorker).courier.id === o.courier.id) : []
                                                                    }
                                                                })}
                                                        />
                                                    </div>

                                                    <label>Клиент</label>
                                                    <div style={{ width: "100%", display: "flex", justifyContent: "space-evenly" }}>
                                                        <p className="value">{(modalData.forBody as OrderForWorker).user ? (modalData.forBody as OrderForWorker).user.username : ""}</p>
                                                        <button
                                                            className="hover-button"
                                                            style={{
                                                                backgroundImage: `url(${InfoIcon})`,
                                                                backgroundSize: "contain",
                                                                backgroundPosition: "center",
                                                                backgroundRepeat: "no-repeat",
                                                                border: "none",
                                                                width: "25px",
                                                                aspectRatio: 1,
                                                                marginLeft: "15px",
                                                            }}
                                                            onClick={() => (modalData.forBody as OrderForWorker).user && setModalData({ title: "Информация о клиенте", body: "client4courier", forBody: (modalData.forBody as OrderForWorker).user })}
                                                        />
                                                    </div>

                                                    <label>Блюда</label>
                                                    {(modalData.forBody as OrderForWorker).orderdish_set.map(dish => {
                                                        return <div style={{ width: "100%", display: "grid", gridTemplateColumns: "40% repeat(4, 15%)", justifyItems: "start" }}>
                                                            <p>{dish.dish}</p>
                                                            <p>{dish.quantity}шт.</p>
                                                            <button
                                                                className="button-light"
                                                                style={{
                                                                    borderRadius: "50%",
                                                                    aspectRatio: 1,
                                                                    maxWidth: "25px",
                                                                }}
                                                                onClick={() => {
                                                                    const copy = JSON.parse(JSON.stringify(modalData.forBody)) as OrderForWorker;
                                                                    const removedDish = copy.orderdish_set.find((d) => d.dish === dish.dish);

                                                                    if (removedDish) {
                                                                        if (removedDish.quantity > 1) {
                                                                            removedDish.quantity--;
                                                                        }
                                                                        else {
                                                                            copy.orderdish_set = copy.orderdish_set.filter((d) => d.dish !== dish.dish);
                                                                        }
                                                                    }
                                                                    setModalData({
                                                                        title: modalData.title,
                                                                        body: modalData.body,
                                                                        forBody: copy
                                                                    });
                                                                }}
                                                            >-</button>
                                                            <p>{getDishTotalCostById(dish.id, dish.quantity)}руб.</p>
                                                            <button
                                                                className="button-dark"
                                                                style={{
                                                                    borderRadius: "50%",
                                                                    aspectRatio: 1,
                                                                    maxWidth: "25px",
                                                                    backgroundImage: `url(${RemoveButton})`,
                                                                    backgroundSize: "75%",
                                                                    backgroundPosition: "center",
                                                                    backgroundRepeat: "no-repeat",
                                                                    marginLeft: "60%"
                                                                }}
                                                                onClick={() => {
                                                                    const copy = JSON.parse(JSON.stringify(modalData.forBody)) as OrderForWorker;
                                                                    const removedDish = copy.orderdish_set.find((d) => d.dish === dish.dish);

                                                                    if (removedDish)
                                                                        copy.orderdish_set = copy.orderdish_set.filter((d) => d.dish !== dish.dish);

                                                                    setModalData({
                                                                        title: modalData.title,
                                                                        body: modalData.body,
                                                                        forBody: copy
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                    })}
                                                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                                                        <p>Итого:</p>
                                                        <p>{
                                                            (modalData.forBody as OrderForWorker).orderdish_set.reduce((acc, curr) => acc + getDishTotalCostById(curr.id, curr.quantity), 0)
                                                        }руб. за {(modalData.forBody as OrderForWorker).orderdish_set.reduce((acc, curr) => acc + curr.quantity, 0)} блюд</p>
                                                    </div>

                                                    <label>Комментарий</label>
                                                    <textarea
                                                        style={{
                                                            minHeight: "30px",
                                                            height: "90px",
                                                            maxHeight: "90px"
                                                        }}
                                                        className="value"
                                                        value={(modalData.forBody as OrderForWorker).comment}
                                                        onChange={(e) => {
                                                            const copy = JSON.parse(JSON.stringify(modalData.forBody)) as OrderForWorker;
                                                            copy.comment = e.target.value;
                                                            setModalData({
                                                                title: modalData.title,
                                                                body: modalData.body,
                                                                forBody: copy
                                                            });
                                                        }}
                                                    />
                                                </>}

                                                <div className="container__buttons-container" style={{ margin: "30px auto 0" }}>
                                                    <button
                                                        style={{ width: "420px" }}
                                                        className="buttons-container__resolve button-dark"
                                                        onClick={() => {
                                                            modalData.forBody && managerApi.editOrder(modalData.forBody as OrderForWorker)
                                                                .then(r => {
                                                                    managerApi.getAllOrders()
                                                                        .then(res => {
                                                                            setAllOrders(res.sort(sortByDeliveryTimeFoo))
                                                                        })
                                                                })
                                                            setModalData(null);
                                                        }}
                                                    >
                                                        Выйти и сохранить
                                                    </button>
                                                </div>
                                            </>}
                                        {modalData.body === "prevOrder4manager"
                                            && <>
                                                {modalData.forBody && <>
                                                    <label htmlFor="dateTime">Время и дата</label>
                                                    <p className="value">{convertDateTime((modalData.forBody as OrderForWorker).delivery_time, true)}</p>

                                                    <label htmlFor="address">Адресс доставки</label>
                                                    <p className="value">{(modalData.forBody as OrderForWorker).address ? (modalData.forBody as OrderForWorker).address.address : ""}</p>

                                                    <label htmlFor="status">Статус</label>
                                                    <p className="value">{convertOrderStatus[(modalData.forBody as OrderForWorker).status]}</p>

                                                    <label>Клиент</label>
                                                    <div style={{ width: "100%", display: "flex", justifyContent: "space-evenly" }}>
                                                        <p className="value">{(modalData.forBody as OrderForWorker).user ? (modalData.forBody as OrderForWorker).user.username : ""}</p>
                                                        <button
                                                            className="hover-button"
                                                            style={{
                                                                backgroundImage: `url(${InfoIcon})`,
                                                                backgroundSize: "contain",
                                                                backgroundPosition: "center",
                                                                backgroundRepeat: "no-repeat",
                                                                border: "none",
                                                                width: "25px",
                                                                aspectRatio: 1,
                                                                marginLeft: "15px",
                                                            }}
                                                            onClick={() => (modalData.forBody as OrderForWorker).user && setModalData({ title: "Информация о клиенте", body: "client4courier", forBody: (modalData.forBody as OrderForWorker).user })}
                                                        />
                                                    </div>


                                                    <label>Курьер</label>
                                                    <div style={{ width: "100%", display: "flex", justifyContent: "space-evenly" }}>
                                                        <p className="value">{(modalData.forBody as OrderForWorker).courier ? (modalData.forBody as OrderForWorker).courier.username : ""}</p>
                                                        <button
                                                            className="hover-button"
                                                            style={{
                                                                backgroundImage: `url(${InfoIcon})`,
                                                                backgroundSize: "contain",
                                                                backgroundPosition: "center",
                                                                backgroundRepeat: "no-repeat",
                                                                border: "none",
                                                                width: "25px",
                                                                aspectRatio: 1,
                                                                marginLeft: "15px",
                                                            }}
                                                            onClick={() => (modalData.forBody as OrderForWorker).courier && setModalData({ title: "Информация о курьере", body: "courier4manager", forBody: (modalData.forBody as OrderForWorker).courier })}
                                                        />
                                                    </div>

                                                    <label>Блюда</label>
                                                    {(modalData.forBody as OrderForWorker).orderdish_set.map(dish => {
                                                        return <div style={{ width: "100%", display: "grid", gridTemplateColumns: "60% repeat(2, 20%)", justifyItems: "start" }}>
                                                            <p>{dish.dish}</p>
                                                            <p>{dish.quantity}шт.</p>
                                                            <p>{getDishTotalCostById(dish.id, dish.quantity)}руб.</p>
                                                        </div>
                                                    })}
                                                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                                                        <p>Итого:</p>
                                                        <p>{(modalData.forBody as OrderForWorker).total_cost}руб. за {(modalData.forBody as OrderForWorker).count_dishes} блюд</p>
                                                    </div>

                                                    <label>Комментарий</label>
                                                    <p className="value" style={{ height: "fit-content", maxHeight: "100px", overflow: "auto" }}>{(modalData.forBody as OrderForWorker).comment ?? ""}</p>
                                                </>}

                                                <div className="container__buttons-container" style={{ margin: "30px auto 0" }}>
                                                    <button
                                                        style={{ width: "420px" }}
                                                        className="buttons-container__resolve button-dark hover-button"
                                                        onClick={() => setModalData(null)}
                                                    >
                                                        Назад
                                                    </button>
                                                </div>
                                            </>}
                                        {modalData.body === "courier4manager"
                                            && <>
                                                {modalData.forBody && <>
                                                    <label htmlFor="dateTime">Логин</label>
                                                    <p className="value">{(modalData.forBody as any).username ?? ""}</p>

                                                    <label htmlFor="address">Телефон</label>
                                                    <p className="value">{(modalData.forBody as any).phone ?? ""}</p>

                                                    <label htmlFor="email">Почта</label>
                                                    <p className="value">{(modalData.forBody as any).email ?? ""}</p>
                                                </>}

                                                {
                                                    (modalData.forBody as any).courierOrders
                                                        && (modalData.forBody as any).courierOrders.length
                                                        ? <>
                                                            <label htmlFor="orders">Активные заказы</label>
                                                            {(modalData.forBody as any).courierOrders.map((order: any) => {
                                                                return <div style={{
                                                                    width: "100%",
                                                                    height: "19px",
                                                                    fontSize: "16px",
                                                                    marginBottom: "13px",
                                                                    display: "grid",
                                                                    gridTemplateColumns: "10% 30% 60%"
                                                                }}>
                                                                    <p>№{order.id}</p>
                                                                    <p>{convertDateTime(order.delivery_time, true)}</p>
                                                                    <p>{order.address ? order.address.address : ''}</p>
                                                                </div>
                                                            })}
                                                        </> : <></>
                                                }

                                                <div className="container__buttons-container" style={{ margin: "30px auto 0" }}>
                                                    <button
                                                        style={{ width: "420px" }}
                                                        className="buttons-container__resolve button-dark hover-button"
                                                        onClick={() => setModalData(null)}
                                                    >
                                                        Назад
                                                    </button>
                                                </div>
                                            </>}
                                    </div>
                                </>
                            }
                        </dialog>

                        {userLogin?.role === 'client' && renderClientPages()}
                        {userLogin?.role === 'courier' && renderCourierPages()}
                        {userLogin?.role === 'manager' && renderManagerPages()}
                    </>}
            </div>

            {user && user.id !== -1 && <Footer needAbout={false} />}

        </div >
    </>
}