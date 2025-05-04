import { useState } from "react"
//@ts-ignore
import NoPhoto from "../../shared/assets/noPhoto.svg"

export const DishImg = (props: { className: string, img: string, onClick: Function }) => {
    const [loaded, setLoaded] = useState(false);
    const [curImage, setCurImage] = useState(props.img);

    const handleError = () => {
        if (!loaded) {
            setLoaded(true);
            setCurImage(NoPhoto);
        }
    }

    return <>
        <img
            src={curImage}
            onError={handleError}
            alt="dish-img"
            className={"dish-item__img " + props.className}
            onClick={() => props.onClick()} />
    </>

}