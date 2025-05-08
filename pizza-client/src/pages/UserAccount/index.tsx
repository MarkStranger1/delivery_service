import { ReactElement, ReactHTMLElement, useContext, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom";
import { Cart, CourierForManager, DeliveryAddress, Dish, Order, OrderForWorker, User } from "../../shared/DataTypes"

import { MainApi, ClientApi, ManagerApi, CourierApi } from "../../shared/OpenAPI/Api";
import { UserContainer } from "../../shared/Containers/UserContainer";

//@ts-ignore
import AttentionIcon from "../../shared/assets/attention.svg"
//@ts-ignore
import EditIcon from "../../shared/assets/editIcon.svg"
//@ts-ignore
import QRCode from "../../shared/assets/qrCode.svg"
//@ts-ignore
import Logo from "../../shared/assets/logoWired.svg"
//@ts-ignore
import TreasureIcon from "../../shared/assets/treasureIcon.svg"

import "./style.scss"
import { ApproveContainer } from "../../shared/Containers/ApproveModal";
import { convertDateTime, validateData } from "../../shared/utils/HelpFunctions";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";

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

    const [scores4Pay, setScores4Pay] = useState<number>(0);
    const approvePayRef = useRef<HTMLDialogElement>(null);

    const [modalData, setModalData] = useState<{
        title: string,
        body: "newAddress" | "aboutScores",
    } | null>(null);
    const helpModalRef = useRef<HTMLDialogElement>(null);

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


    const [selectedPage, setSelectedPage] = useState<'login' | 'updData' | 'currOrder' | 'allOrders' | 'allCouriers'>('login');

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

    const removeDishHandler = (dishName: string) => {
        if (user) {
            const clientApi = new ClientApi();

            const copy = JSON.parse(JSON.stringify(userCart));
            const removedDish = copy.dishes.find((d: any) => d.dish === dishName);

            if (removedDish) {
                if (removedDish.quantity > 1) {
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
        if (sortByStatus === 1) return convertStatusForSort[a.status as keyof typeof convertStatusForSort] - convertStatusForSort[b.status as keyof typeof convertStatusForSort];
        if (sortByStatus === -1) return convertStatusForSort[b.status as keyof typeof convertStatusForSort] - convertStatusForSort[a.status as keyof typeof convertStatusForSort];
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
                        const newHistory = response[0].filter((cart: any) => cart.status === "delivered" || cart.status === "cancelled").sort(sortByDeliveryTimeFoo)
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
                                || !validateData(userRegisterPass, "password")
                                || !validateData(userLoginPass, "password")
                            }
                            className="edit-user-info__button-submit button-dark"
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
                        <button className="scores-container__check-about button-dark" onClick={() => setModalData({ title: "Бальная система", body: "aboutScores" })}>Подробнее</button>
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
                                                className="list-item__delete-button button-dark"
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
                                    className="list-item__add-address-button button-dark"
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
                                    className="list-item__add-address-button button-dark"
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
            <h1 className="main-content__title">Текущий заказ</h1>

            {user
                && userCart
                && <dialog ref={approvePayRef} className="approvePayModal">
                    <h3>Оплатить заказ</h3>
                    <img src={QRCode} alt="" style={{ width: "300px", aspectRatio: "1" }} />
                    <label htmlFor="input-scores">Оплатить баллами?</label>
                    <input
                        type="number"
                        id="input-scores"
                        className="input-scores"
                        min={1}
                        max={user?.scores < userCart?.total_cost ? user?.scores : userCart?.total_cost}
                        value={scores4Pay}
                        onChange={(e) => {
                            if (user) {
                                let inputed = Number.parseInt(e.target.value);
                                if (inputed < 0) inputed = 0;
                                if (inputed > user.scores) inputed = user.scores;
                                setScores4Pay(inputed);
                            }
                        }}
                        placeholder={`Доступно ${user?.scores < userCart?.total_cost ? user?.scores : userCart?.total_cost} баллов`}
                    />
                    <div className="buttons-container">
                        <button
                            className="buttons-container__back"
                            onClick={() => approvePayRef.current?.close()}
                        >Вернуться</button>
                        <button
                            className="buttons-container__approve"
                            onClick={() => {
                                if (userCart) {
                                    const copy = JSON.parse(JSON.stringify(userCart));
                                    copy.status = "deliver";

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

                                    const userCopy = JSON.parse(JSON.stringify(user)) as User;
                                    userCopy.scores += Math.round((userCart.total_cost - scores4Pay) / 10) - scores4Pay;
                                    mainApi.editUserInfo(userCopy)

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

            {userCart
                ?
                <>
                    <div className="main-content__cart-container">

                        <div className="cart-container__left-cart">

                            <span className="left-cart__title"><b>Заказ в</b>
                                <select
                                    className="title__select-address"
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
                                {/* <p className="title__status"><b>Статус: </b>{convertOrderStatus[userCart.status as keyof typeof convertOrderStatus]}</p> */}
                            </span>
                            <div className="left-cart__change-time"> <b>Время доставки: </b>
                                <input
                                    type="datetime-local"
                                    className="change-time__input-delvery-time"
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
                            </div>

                            <div className="left-cart__dishes-container">

                                <b>Стоимость заказа: </b> {userCart.total_cost} руб.

                                <div className="dishes-container__dishes-list">
                                    <b>Содержимое:</b><br />
                                    {userCart.dishes && userCart.dishes.length > 0 && userCart.dishes.map(dish => {
                                        return <>
                                            <p className="dishes-list__dish-item">
                                                <button
                                                    className="dish-item__remove-item"
                                                    onClick={() => removeDishHandler(dish.dish)}
                                                />
                                                <button
                                                    className="dish-item__inc-item"
                                                    onClick={() => addDishHandler(dish.dish)}
                                                />
                                                {dish.dish} - {dish.quantity} шт. ({getDishTotalCostById(dish.id, dish.quantity)} руб.)
                                            </p>
                                        </>
                                    })}
                                </div>
                            </div>

                            <div className="left-cart__divider" />

                            <div className="left-cart__buttons-container">
                                <button
                                    className="buttons-container__button"
                                    disabled={!userAddresses || userAddresses.length === 0 || userCart.count_dishes === 0}
                                    onClick={() => {
                                        approvePayRef.current?.showModal();
                                    }}>Оплатить</button>
                                <button
                                    className="buttons-container__button"
                                    disabled={!userAddresses || userAddresses.length === 0 || userCart.count_dishes === 0}
                                    onClick={() => {
                                        showApproveModal({
                                            text: "очистить корзину",
                                            resolve: () => { clearCartHandler(); showApproveModal(null); },
                                            reject: () => showApproveModal(null)
                                        })
                                    }}
                                >Очистить</button>
                            </div>

                        </div>


                        {activeUserCarts
                            &&
                            <>
                                <div className="cart-container__right-cart-container">
                                    {activeUserCarts.map(activeCart => {
                                        return <>
                                            <div className="cart-container__right-cart">
                                                <span className="right-cart__title">
                                                    <p className="title__select-address"><b>Заказ в</b> {activeCart.address}</p>
                                                    <p className="title__status"><b>Статус: </b>{convertOrderStatus[activeCart.status as keyof typeof convertOrderStatus]}</p>
                                                </span>
                                                <div className="right-cart__change-time"> <b>Время доставки: </b>
                                                    <p className="change-time__text">{activeCart.delivery_time.split("T")[0]} {activeCart.delivery_time.split("T")[1].slice(0, 5)}</p>
                                                </div>

                                                <div className="right-cart__dishes-container">

                                                    <b>Стоимость заказа: </b> {activeCart.total_cost} руб.

                                                    <div className="dishes-container__dishes-list">
                                                        <b>Содержимое:</b><br />
                                                        {activeCart.dishes && activeCart.dishes.length > 0 && activeCart.dishes.map(dish => {
                                                            return <>
                                                                <p className="dishes-list__dish-item">
                                                                    {dish.dish} - {dish.quantity} шт. ({getDishTotalCostById(dish.id, dish.quantity)} руб.)
                                                                </p>
                                                            </>
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="right-cart__divider" />

                                                <div className="right-cart__buttons-container">
                                                    <button className="buttons-container__button" onClick={() => {
                                                        showApproveModal({
                                                            text: "отменить заказ",
                                                            resolve: () => {
                                                                clientApi.updateActiveCart(activeCart.id, 'cancelled')
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
                                                    }}>Отменить</button>
                                                    {activeCart.status === "deliver" && <>
                                                        <button
                                                            className="buttons-container__button"
                                                            onClick={() => {
                                                                clientApi.updateActiveCart(activeCart.id, 'delivered')
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
                                                        >
                                                            Доставлено
                                                        </button>
                                                    </>}
                                                </div>
                                            </div>
                                        </>
                                    })}
                                </div>
                            </>
                        }
                    </div>
                </>
                :
                <>
                    <h2 className="main-content__sub-title">Корзина пуста</h2>
                </>
            }
        </>
        if (selectedPage === 'allOrders') return <>
            <h1 className="main-content__title">История заказов</h1>

            {userOrdersHistory
                ?
                <>
                    <div className="main-content__list-container">
                        {userOrdersHistory.map(order => {
                            return <>
                                <div className="list-container__list-item">
                                    <h4 className="list-item__title">Заказ от {convertDateTime(order.delivery_time)} - {convertOrderStatus[order.status as keyof typeof convertOrderStatus]}</h4>
                                    <p className="list-item__cost"><b>Стоимость:</b> {order.total_cost} руб.</p>
                                    <p className="list-item__count-dishes"><b>Количество блюд:</b> {order.count_dishes}</p>
                                    <p className="list-item__address"><b>Адрес:</b> {order.address}</p>
                                    <p className="list-item__comment"><b>Комментарий:</b> {order.comment}</p>
                                    <p><b>Блюда в заказе:</b></p>
                                    <div className="list-item__dishes-list">
                                        {order.dishes.map(dish => {
                                            return <>
                                                <div className="dishes-list__list-item">
                                                    <p>{dish.dish} - {dish.quantity} шт.</p>
                                                </div>
                                            </>
                                        })}
                                    </div>
                                </div>
                            </>
                        })}
                    </div>
                </>
                :
                <>
                    <h2 className="main-content__sub-title">Заказов ещё не было, но никогда не поздно начать!</h2>
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
                                || !validateData(userRegisterPass, "password")
                                || !validateData(userLoginPass, "password")
                            }
                            className="edit-user-info__button-submit button-dark"
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
            <h1 className="main-content__title">Текущий заказ</h1>
            {courierActiveOrders ? courierActiveOrders.map(order => {
                return <div className="cart-container__left-cart--courier">

                    <span className="left-cart__title"><b>Заказ в</b>
                        <p className="title__select-address">{order.address.address}</p>
                        <p className="title__status"><b>Статус: </b>{convertOrderStatus[order.status as keyof typeof convertOrderStatus]}</p>
                    </span>
                    <div className="left-cart__change-time"> <b>Время доставки: </b>
                        <p className="change-time__input-delvery-time">{order.delivery_time.split("T").join(" - ")}</p>
                    </div>

                    <div className="left-cart__dishes-container">

                        <b>Стоимость заказа: </b> {order.total_cost} руб.

                        <div className="dishes-container__dishes-list">
                            <b>Содержимое:</b><br />
                            {order.orderdish_set && order.orderdish_set.length > 0 && order.orderdish_set.map(dish => {
                                return <>
                                    <p className="dishes-list__dish-item">
                                        {dish.dish} - {dish.quantity} шт. ({getDishTotalCostById(dish.id, dish.quantity)} руб.)
                                    </p>
                                </>
                            })}
                        </div>
                    </div>

                    {order.comment
                        && order.comment.length > 0
                        && <div className="left-cart__comment">
                            <b>Комментарий:</b><br />
                            <p>{order.comment}</p>
                        </div>}
                </div>
            }) : <></>}
        </>
        if (selectedPage === 'allOrders') return <>
            <h1 className="main-content__title">История заказов</h1>
            {courierHistory ? courierHistory.map(order => {
                return <div className="cart-container__left-cart--courier">

                    <span className="left-cart__title"><b>Заказ в</b>
                        <p className="title__select-address">{order.address ? order.address.address : ""}</p>
                        <p className="title__status"><b>Статус: </b>{convertOrderStatus[order.status as keyof typeof convertOrderStatus]}</p>
                    </span>
                    <div className="left-cart__change-time"> <b>Время доставки: </b>
                        <p className="change-time__input-delvery-time">{order.delivery_time.split("T").join(" - ")}</p>
                    </div>

                    <div className="left-cart__dishes-container">

                        <b>Стоимость заказа: </b> {order.total_cost} руб.

                        <div className="dishes-container__dishes-list">
                            <b>Содержимое:</b><br />
                            {order.orderdish_set && order.orderdish_set.length > 0 && order.orderdish_set.map(dish => {
                                return <>
                                    <p className="dishes-list__dish-item">
                                        {dish.dish} - {dish.quantity} шт. ({getDishTotalCostById(dish.id, dish.quantity)} руб.)
                                    </p>
                                </>
                            })}
                        </div>
                    </div>

                    {order.comment
                        && order.comment.length > 0
                        && <div className="left-cart__comment">
                            <b>Комментарий:</b><br />
                            <p>{order.comment}</p>
                        </div>
                    }
                </div>
            }) : <></>}
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
                        || !validateData(userRegisterPass, "password")
                        || !validateData(userLoginPass, "password")
                    }
                    className="edit-user-info__button-submit button-dark"
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
        if (selectedPage === 'allOrders' && allOrders) {
            const orders2Show = sortByStatus !== 0 ? allOrders.sort(sortByStatusFoo) : allOrders;

            return <>
                <div className="list-container__sort-panel">
                    <div className="sort-panel__item--void" />
                    <button className="sort-panel__button" onClick={() => {
                        if (sortByStatus === -1) setSortByStatus(0);
                        else if (sortByStatus === 0) setSortByStatus(1);
                        else if (sortByStatus === 1) setSortByStatus(-1);
                    }}>Сортировать {sortByStatus === -1 ? "↓" : (sortByStatus === 1 ? "↑" : '')}</button>
                    <div className="sort-panel__item--void" />
                    <div className="sort-panel__item--void" />
                </div>
                <div className="main-content__list-container">

                    <dialog ref={editOrderRef}>
                        {editedOrder && <>
                            <h4 className="list-item__title">Заказ от
                                <input
                                    type="datetime-local"
                                    className="title__change-date"
                                    value={editedOrder.delivery_time}
                                    onChange={(e) => {
                                        if (validateData(e.target.value, "datetime")) {
                                            const copy = JSON.parse(JSON.stringify(editedOrder)) as OrderForWorker;
                                            copy.delivery_time = e.target.value;
                                            setEditedOrder(copy);
                                        }
                                    }} />
                                - {convertOrderStatus[editedOrder.status as keyof typeof convertOrderStatus]}
                            </h4>
                            <p className="list-item__about-client">
                                <b>Клиент:</b> {editedOrder.user.username} | {editedOrder.user.phone} | {editedOrder.user.email}
                            </p>
                            <p className="list-item__about-courier">
                                <b>Курьер:</b> <select
                                    disabled={editedOrder.status === "delivered"}
                                    value={editedOrder.courier ? `${editedOrder.courier.id} - ${editedOrder.courier.username}` : ''}
                                    onChange={(e) => {
                                        const courierId = e.target.value.split(' - ').at(0);
                                        if (courierId && allCouriers) {
                                            const courier = allCouriers.find(c => c.id === Number.parseInt(courierId))
                                            if (courier) {
                                                const copy = JSON.parse(JSON.stringify(editedOrder)) as OrderForWorker;
                                                copy.courier = courier;
                                                setEditedOrder(copy);
                                                managerApi.editOrder(copy)
                                                    .then(r => {
                                                        managerApi.getAllOrders()
                                                            .then(res => setAllOrders(res.sort(sortByDeliveryTimeFoo)))
                                                    })
                                            }
                                        }
                                    }}
                                >
                                    {allCouriers && allCouriers.map((courier) => {
                                        return <>
                                            <option>{courier.id} - {courier.username}</option>
                                        </>
                                    })}
                                </select>
                                {!editedOrder.courier && <img src={AttentionIcon} alt="attention" style={{ maxHeight: "25px", aspectRatio: "1" }} />}
                            </p>
                            <p className="list-item__cost"><b>Стоимость:</b> {editedOrder.total_cost} руб.</p>
                            <p className="list-item__count-dishes"><b>Количество блюд:</b> {editedOrder.count_dishes}</p>
                            <p className="list-item__address"><b>Адрес:</b> {editedOrder.address ? editedOrder.address.address : ''}</p>
                            <b>Комментарий:</b><input className="list-item__comment" value={editedOrder.comment} onChange={(e) => {
                                const copy = JSON.parse(JSON.stringify(editedOrder)) as OrderForWorker;
                                copy.comment = e.target.value;
                                setEditedOrder(copy);
                            }} />
                            <p><b>Блюда в заказе:</b></p>
                            <div className="list-item__dishes-list" style={{ maxWidth: "440px" }}>
                                {editedOrder.orderdish_set.map(dish => {
                                    return <>
                                        <p className="dishes-list__dish-item">
                                            <button
                                                className="dish-item__remove-item"
                                                onClick={() => {
                                                    const copy = JSON.parse(JSON.stringify(editedOrder)) as OrderForWorker;
                                                    const removedDish = copy.orderdish_set.find((d) => d.dish === dish.dish);

                                                    if (removedDish) {
                                                        if (removedDish.quantity > 1) {
                                                            removedDish.quantity--;
                                                        }
                                                        else {
                                                            copy.orderdish_set = copy.orderdish_set.filter((d) => d.dish !== dish.dish);
                                                        }
                                                    }
                                                    setEditedOrder(copy);
                                                }}
                                            />
                                            {dish.dish} - {dish.quantity} шт. ({getDishTotalCostById(dish.id, dish.quantity)} руб.)
                                        </p>
                                    </>
                                })}
                            </div>
                        </>}
                        <button onClick={() => {
                            editOrderRef.current?.close();
                            editedOrder && managerApi.editOrder(editedOrder)
                                .then(r => {
                                    managerApi.getAllOrders()
                                        .then(res => {
                                            setAllOrders(res.sort(sortByDeliveryTimeFoo))
                                        })
                                })
                        }}>Выйти и сохранить</button>
                    </dialog>
                    {orders2Show.map(order => {
                        return <>
                            <div className={"list-container__list-item" + (user && user.role === 'manager' ? "--manager" : "")}>

                                {user && user.role === 'manager' ?
                                    <>
                                        <button
                                            className="list-item__edit-button"
                                            style={{ backgroundImage: `url(${EditIcon})` }}
                                            onClick={() => {
                                                editOrderRef.current && editOrderRef.current.showModal();
                                                setEditedOrder(order);
                                            }}
                                        />
                                        <p className="list-item__title">Заказ от {convertDateTime(order.delivery_time)} - {convertOrderStatus[order.status as keyof typeof convertOrderStatus]}</p>
                                        <p className="list-item__about-client"><b>Клиент:</b> {order.user.username}</p>
                                        <p className="list-item__about-courier"><b>Курьер:</b> {order.courier ? order.courier.username : ''}</p>
                                    </>
                                    : <>
                                        <h4 className="list-item__title">Заказ от {convertDateTime(order.delivery_time)} - {convertOrderStatus[order.status as keyof typeof convertOrderStatus]}</h4>
                                        <p className="list-item__about-client">
                                            <b>Клиент:</b> {order.user.username} | {order.user.phone} | {order.user.email}
                                        </p>
                                        <p className="list-item__about-courier">
                                            <b>Курьер:</b> <select
                                                className=""
                                                value={order.courier ? `${order.courier.id} - ${order.courier.username}` : ''}
                                                onChange={(e) => {
                                                    const courierId = e.target.value.split(' - ').at(0);
                                                    if (courierId && allCouriers) {
                                                        const courier = allCouriers.find(c => c.id === Number.parseInt(courierId))
                                                        if (courier) {
                                                            const copy = JSON.parse(JSON.stringify(order)) as OrderForWorker;
                                                            copy.courier = courier;
                                                            managerApi.editOrder(copy)
                                                                .then(r => {
                                                                    managerApi.getAllOrders()
                                                                        .then(res => setAllOrders(res.sort(sortByDeliveryTimeFoo)))
                                                                })
                                                        }
                                                    }
                                                }}
                                            >
                                                {allCouriers && allCouriers.map((courier) => {
                                                    return <>
                                                        <option>{courier.id} - {courier.username}</option>
                                                    </>
                                                })}
                                            </select>
                                            {!order.courier && <img src={AttentionIcon} alt="attention" style={{ maxHeight: "25px", aspectRatio: "1" }} />}
                                        </p>
                                        <p className="list-item__cost"><b>Стоимость:</b> {order.total_cost} руб.</p>
                                        <p className="list-item__count-dishes"><b>Количество блюд:</b> {order.count_dishes}</p>
                                        <p className="list-item__address"><b>Адрес:</b> {order.address ? order.address.address : ''}</p>
                                        <p className="list-item__comment"><b>Комментарий:</b> {order.comment}</p>
                                        <p><b>Блюда в заказе:</b></p>
                                        <div className="list-item__dishes-list">
                                            {order.orderdish_set.map(dish => {
                                                return <>
                                                    <div className="dishes-list__list-item">
                                                        <p>{dish.dish} - {dish.quantity} шт.</p>
                                                    </div>
                                                </>
                                            })}
                                        </div>
                                    </>}
                            </div>
                        </>
                    })}
                </div>
            </>
        }
        if (selectedPage === 'allCouriers' && allCouriers) {
            const orders2Show = sortByCount !== 0 ? allCouriers.sort(sortByCountFoo) : allCouriers;

            return <>
                <div className="list-container__sort-panel">
                    <div className="sort-panel__item--void" />
                    <button className="sort-panel__button" onClick={() => {
                        if (sortByCount === -1) setSortByCount(0);
                        else if (sortByCount === 0) setSortByCount(1);
                        else if (sortByCount === 1) setSortByCount(-1);
                    }}>Сортировать {sortByCount === -1 ? "↓" : (sortByCount === 1 ? "↑" : '')}</button>
                    <div className="sort-panel__item--void" />
                    <div className="sort-panel__item--void" />
                </div>
                <div className="main-content__list-container">
                    {orders2Show.map(courier => {

                        const courierOrders = allOrders ? allOrders?.filter(order => order.courier && order.courier.id === courier.id) : []

                        return <>
                            <div className="list-container__list-item">
                                <h4 className="list-item__title">Курьер: {courier.username}</h4>
                                <p className="list-item__email"><b>Email:</b> {courier.email}</p>
                                <p className="list-item__phone"><b>Номер телефона:</b> {courier.phone}</p>
                                {courierOrders
                                    && courierOrders.length
                                    ? <>
                                        <p><b>Активные заказы ({courierOrders.length}):</b></p>
                                        <div className="list-item__dishes-list">
                                            {courierOrders.map(order => {
                                                return <>
                                                    <div className="dishes-list__list-item">
                                                        <p>Время: {convertDateTime(order.delivery_time)} {order.delivery_time.split('T').at(-1)?.slice(0, -3)}</p>
                                                        <p>Место: {order.address ? order.address.address : ''}</p>
                                                    </div>
                                                </>
                                            })}
                                        </div>
                                    </> : <>Нет активных заказов</>}
                            </div>
                        </>
                    })}
                </div>
            </>
        }
    }

    return <>
        <div className="user-page">

            <Header user={user} onLogout={() => {
                setUser(null);
                setUserLogin(defaultUser);
                document.cookie = `sessionToken=`
            }} />

            {userLogin?.id !== -1 &&
                <div className="user-page__nav-bar">
                    {userLogin?.role === 'client'
                        &&
                        <>
                            <button className={"nav-bar__nav-item" + (selectedPage === "updData" ? " selected" : "")} onClick={() => setSelectedPage('updData')}>Изменить личные данные</button>
                            <button className={"nav-bar__nav-item" + (selectedPage === "currOrder" ? " selected" : "")} onClick={() => setSelectedPage('currOrder')}>Текущий заказ</button>
                            <button className={"nav-bar__nav-item" + (selectedPage === "allOrders" ? " selected" : "")} onClick={() => setSelectedPage('allOrders')}>Список оплаченных заказов</button>
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
                            <button className={"nav-bar__nav-item" + (selectedPage === "allOrders" ? " selected" : "")} onClick={() => setSelectedPage('allOrders')}>Список всех заказов</button>
                            <button className={"nav-bar__nav-item" + (selectedPage === "allCouriers" ? " selected" : "")} onClick={() => setSelectedPage('allCouriers')}>Список всех курьеров</button>
                        </>
                    }
                </div>
            }

            <div className={user?.id === -1 ? "user-page__main-content--login" : "user-page__main-content"}>

                {userLogin
                    && userLogin?.id === -1
                    && userRegister
                    ? <>
                        <div className="main-content__forms-container">
                            <div className="forms-container__create-login-form">
                                <h4 className="create-login-form__form-title">
                                    <img src={Logo} alt="logo" className="form-title__img" />
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
                                    <label style={{ color: "red", textShadow: "0 0 4px #ff00008f;" }}>{userRegisterPass !== "" && tmpPass !== "" && userRegisterPass !== tmpPass ? "Not eval" : ""}</label>
                                    <input
                                        type="password"
                                        className="create-login-form__input input-passwd"
                                        value={tmpPass}
                                        onChange={(e) => setTmpPass(e.target.value)}
                                        placeholder=" Повторите пароль"
                                    />
                                </div>
                                <button
                                    className="create-login-form__button-submit button-dark"
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
                                    зарегистрироваться
                                </button>
                            </div>

                            <div className="forms-container__login-form">
                                <h4 className="create-login-form__form-title ">
                                    <img src={Logo} alt="logo" className="form-title__img" />
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
                                    className="login-form__button-submit button-dark"
                                    disabled={!userLogin.email || !userLoginPass}
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
                            </div>
                        </div>
                    </>
                    :
                    <>

                        <dialog ref={helpModalRef} className='approve-modal'>
                            {modalData
                                && <>
                                    <p className="approve-modal__title">{modalData.title}</p>
                                    <div className="approve-modal__container">
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
                                                <div className="container__buttons-container">
                                                    <button
                                                        className="buttons-container__reject button-dark"
                                                        onClick={() => setModalData(null)}
                                                    >Назад</button>
                                                    <button
                                                        className="buttons-container__resolve button-dark"
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
                                                <div className="container__buttons-container" style={{ marginTop: "30px" }}>
                                                    <button
                                                        className="buttons-container__resolve button-dark"
                                                        onClick={() => setModalData(null)}
                                                    >
                                                        Отлично!
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

            <Footer needAbout={false} />

        </div >
    </>
}