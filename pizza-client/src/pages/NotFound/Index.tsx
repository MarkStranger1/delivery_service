import { useContext } from "react"
import { Footer } from "../../components/Footer"
import { Header } from "../../components/Header"
import { UserContainer } from "../../shared/Containers/UserContainer"

export const NotFoundPage = () => {

    const { user } = useContext(UserContainer);

    return <>
        <Header user={user} />

        <h1 className="not-found" style={{
            fontSize: "100px",
            margin: "0 auto",
            height: "280px",
            width: "fit-content"
        }}>404</h1>
        <Footer needAbout={true} />
    </>
}