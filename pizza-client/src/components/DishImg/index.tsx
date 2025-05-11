import { useEffect, useState } from "react"
//@ts-ignore
import NoPhoto from "../../shared/assets/noPhoto.svg"

export const DishImg = (props: { key: string, className: string, img: (() => string) | string, onClick: Function }) => {
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
            key={props.key}
            onLoad={(e) => {
                if (typeof props.img === "string")
                    e.currentTarget.src = props.img
                else e.currentTarget.src = props.img()
            }}
            src={curImage ?? NoPhoto}
            onError={handleError}
            alt="dish-img"
            className={"dish-item__img " + props.className}
            onClick={() => props.onClick()} />
    </>

}