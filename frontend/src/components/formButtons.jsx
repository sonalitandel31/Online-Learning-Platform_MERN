function FormButton({ type = "button", id, text, onClick }) {
    return (
        <button type={type} id={id} onClick={onClick}>{text}</button>
    );
}

export default FormButton;