"use client";

import { useId, useState, type KeyboardEvent } from "react";

const countryCodes =
  "AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW".split(
    " ",
  );
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
export const validCountries = countryCodes
  .filter((code, index) => countryCodes.indexOf(code) === index)
  .map((code) => regionNames.of(code))
  .filter((name): name is string => Boolean(name))
  .sort((a, b) => a.localeCompare(b));

export function CountrySelect({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  const generatedId = useId();
  const listId = `${id || generatedId}-options`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const matches = validCountries.filter((country) =>
    country.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()),
  );
  const activeOptionId =
    open && activeIndex >= 0 && matches[activeIndex]
      ? `${listId}-${activeIndex}`
      : undefined;

  function choose(country: string) {
    onChange(country);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (!matches.length) {
        setActiveIndex(-1);
        return;
      }
      setActiveIndex((current) => {
        const start = current < 0 ? (event.key === "ArrowDown" ? -1 : 0) : current;
        return event.key === "ArrowDown"
          ? (start + 1) % matches.length
          : (start - 1 + matches.length) % matches.length;
      });
    } else if (event.key === "Enter" && open && matches.length) {
      event.preventDefault();
      choose(matches[activeIndex < 0 ? 0 : activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div
      className="country-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <label className="country-select-label" htmlFor={id}>{label}</label>
      <input
        className="country-select-input"
        id={id}
        required
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeOptionId}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {open && (
        <ul className="country-select-popover" id={listId} role="listbox" aria-label={`${label} options`}>
          {matches.length ? (
            matches.map((country, index) => (
              <li key={country} role="presentation">
                <button
                  type="button"
                  id={`${listId}-${index}`}
                  className={`country-select-option${activeIndex === index ? " active" : ""}`}
                  role="option"
                  aria-selected={value === country}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(country)}
                >
                  {country}
                </button>
              </li>
            ))
          ) : (
            <li
              className="country-select-empty"
              role="option"
              aria-disabled="true"
              aria-selected="false"
            >
              No matching countries
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
