function FormInput({ label, type = "text", id, name, inputRef, placeholder, value, onChange, error, autoComplete }) {
  return (
    <div className="form-input">
      <label htmlFor={id}>{label}: &nbsp;</label>
      <input type={type} id={id} name={name} value={type === "file" ? undefined : value} ref={inputRef} placeholder={placeholder} onChange={onChange} autoComplete={autoComplete} className={error ? "input-error" : ""}/>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default FormInput;
