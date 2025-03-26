import { useState } from "react"

import "./style.scss"
import { Link } from "react-router-dom";

export const UserAccountPage = () => {


    const [user, setUser] = useState<"anonim" | "user" | "deliver" | "manager">("anonim");

    return <>
        <div className="user-page">
            <div className="user-page__nav-bar">
                <Link to="/" className="nav-bar__return">{'<-Home'}</Link>
                {
                    ["anonim", "user", "deliver", "manager"].map((userRole) => {
                        return <>
                            {/* @ts-ignore */}
                            <button className="change-user" onClick={() => setUser(userRole)}>{userRole}</button>
                        </>
                    })
                }
            </div>

            <div className="user-page__main-content">
                <h1 className="main-content__header">{user}</h1>
            </div>
        </div>
    </>
}