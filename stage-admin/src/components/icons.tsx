type IconProps = React.HTMLAttributes<SVGElement>;

export const Icons = {
  logo: (props: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" {...props}>
      <rect width="256" height="256" fill="none" />
      <line
        x1="208"
        y1="128"
        x2="128"
        y2="208"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <line
        x1="192"
        y1="40"
        x2="40"
        y2="192"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
    </svg>
  ),
  facebookIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  },
  instagramIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    );
  },
  linkedinIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    );
  },
  twitterIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
      </svg>
    );
  },
  post: (props: IconProps) => (
    <svg
      {...props}
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.1464 1.14645C12.3417 0.951184 12.6583 0.951184 12.8535 1.14645L14.8535 3.14645C15.0488 3.34171 15.0488 3.65829 14.8535 3.85355L10.9109 7.79618C10.8349 7.87218 10.7471 7.93543 10.651 7.9835L6.72359 9.94721C6.53109 10.0435 6.29861 10.0057 6.14643 9.85355C5.99425 9.70137 5.95652 9.46889 6.05277 9.27639L8.01648 5.34897C8.06455 5.25283 8.1278 5.16507 8.2038 5.08907L12.1464 1.14645ZM12.5 2.20711L8.91091 5.79618L7.87266 7.87267L8.12731 8.12732L10.2038 7.08907L13.7929 3.5L12.5 2.20711ZM9.99998 2L8.99998 3H4.9C4.47171 3 4.18056 3.00039 3.95552 3.01877C3.73631 3.03668 3.62421 3.06915 3.54601 3.10899C3.35785 3.20487 3.20487 3.35785 3.10899 3.54601C3.06915 3.62421 3.03669 3.73631 3.01878 3.95552C3.00039 4.18056 3 4.47171 3 4.9V11.1C3 11.5283 3.00039 11.8194 3.01878 12.0445C3.03669 12.2637 3.06915 12.3758 3.10899 12.454C3.20487 12.6422 3.35785 12.7951 3.54601 12.891C3.62421 12.9309 3.73631 12.9633 3.95552 12.9812C4.18056 12.9996 4.47171 13 4.9 13H11.1C11.5283 13 11.8194 12.9996 12.0445 12.9812C12.2637 12.9633 12.3758 12.9309 12.454 12.891C12.6422 12.7951 12.7951 12.6422 12.891 12.454C12.9309 12.3758 12.9633 12.2637 12.9812 12.0445C12.9996 11.8194 13 11.5283 13 11.1V6.99998L14 5.99998V11.1V11.1207C14 11.5231 14 11.8553 13.9779 12.1259C13.9549 12.407 13.9057 12.6653 13.782 12.908C13.5903 13.2843 13.2843 13.5903 12.908 13.782C12.6653 13.9057 12.407 13.9549 12.1259 13.9779C11.8553 14 11.5231 14 11.1207 14H11.1H4.9H4.87934C4.47686 14 4.14468 14 3.87409 13.9779C3.59304 13.9549 3.33469 13.9057 3.09202 13.782C2.7157 13.5903 2.40973 13.2843 2.21799 12.908C2.09434 12.6653 2.04506 12.407 2.0221 12.1259C1.99999 11.8553 1.99999 11.5231 2 11.1207V11.1206V11.1V4.9V4.87935V4.87932V4.87931C1.99999 4.47685 1.99999 4.14468 2.0221 3.87409C2.04506 3.59304 2.09434 3.33469 2.21799 3.09202C2.40973 2.71569 2.7157 2.40973 3.09202 2.21799C3.33469 2.09434 3.59304 2.04506 3.87409 2.0221C4.14468 1.99999 4.47685 1.99999 4.87932 2H4.87935H4.9H9.99998Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      ></path>
    </svg>
  ),
  filePlus: (props: IconProps) => (
    <svg
      {...props}
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.5 2C3.22386 2 3 2.22386 3 2.5V12.5C3 12.7761 3.22386 13 3.5 13H11.5C11.7761 13 12 12.7761 12 12.5V4.70711L9.29289 2H3.5ZM2 2.5C2 1.67157 2.67157 1 3.5 1H9.5C9.63261 1 9.75979 1.05268 9.85355 1.14645L12.7803 4.07322C12.921 4.21388 13 4.40464 13 4.60355V12.5C13 13.3284 12.3284 14 11.5 14H3.5C2.67157 14 2 13.3284 2 12.5V2.5ZM4.75 7.5C4.75 7.22386 4.97386 7 5.25 7H7V5.25C7 4.97386 7.22386 4.75 7.5 4.75C7.77614 4.75 8 4.97386 8 5.25V7H9.75C10.0261 7 10.25 7.22386 10.25 7.5C10.25 7.77614 10.0261 8 9.75 8H8V9.75C8 10.0261 7.77614 10.25 7.5 10.25C7.22386 10.25 7 10.0261 7 9.75V8H5.25C4.97386 8 4.75 7.77614 4.75 7.5Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      ></path>
    </svg>
  ),
  calendarIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    );
  },
  homeIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  },
  pieChartIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    );
  },

  plusIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
    );
  },

  settingsIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  },

  bellIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    );
  },
  searchIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    );
  },
  uploadIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
      </svg>
    );
  },
  xIcon(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    );
  },
  homePageInputLogo(props: IconProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h4V3H3z" />
        <path d="M17 3v18h4V3h-4z" />
        <path d="M3 12h18" />
      </svg>
    );
  },
  editIcon(props: IconProps) {
    return (
      <svg
        {...props}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9.99967 15.1673H5.99967C2.37967 15.1673 0.833008 13.6207 0.833008 10.0007V6.00065C0.833008 2.38065 2.37967 0.833984 5.99967 0.833984H7.33301C7.60634 0.833984 7.83301 1.06065 7.83301 1.33398C7.83301 1.60732 7.60634 1.83398 7.33301 1.83398H5.99967C2.92634 1.83398 1.83301 2.92732 1.83301 6.00065V10.0007C1.83301 13.074 2.92634 14.1673 5.99967 14.1673H9.99967C13.073 14.1673 14.1663 13.074 14.1663 10.0007V8.66732C14.1663 8.39398 14.393 8.16732 14.6663 8.16732C14.9397 8.16732 15.1663 8.39398 15.1663 8.66732V10.0007C15.1663 13.6207 13.6197 15.1673 9.99967 15.1673Z"
          fill="#C60C0C"
        />
        <path
          d="M5.66591 11.7924C5.25924 11.7924 4.88591 11.6457 4.61257 11.3791C4.28591 11.0524 4.14591 10.5791 4.21924 10.0791L4.50591 8.0724C4.55924 7.68573 4.81257 7.18573 5.08591 6.9124L10.3392 1.65906C11.6659 0.332396 13.0126 0.332396 14.3392 1.65906C15.0659 2.38573 15.3926 3.12573 15.3259 3.86573C15.2659 4.46573 14.9459 5.0524 14.3392 5.6524L9.08591 10.9057C8.81257 11.1791 8.31257 11.4324 7.92591 11.4857L5.91924 11.7724C5.83257 11.7924 5.74591 11.7924 5.66591 11.7924ZM11.0459 2.36573L5.79257 7.61906C5.66591 7.74573 5.51924 8.03906 5.49257 8.2124L5.20591 10.2191C5.17924 10.4124 5.21924 10.5724 5.31924 10.6724C5.41924 10.7724 5.57924 10.8124 5.77257 10.7857L7.77924 10.4991C7.95257 10.4724 8.25257 10.3257 8.37257 10.1991L13.6259 4.94573C14.0592 4.5124 14.2859 4.12573 14.3192 3.76573C14.3592 3.3324 14.1326 2.8724 13.6259 2.35906C12.5592 1.2924 11.8259 1.5924 11.0459 2.36573Z"
          fill="#C60C0C"
        />
        <path
          d="M13.233 6.55417C13.1864 6.55417 13.1397 6.5475 13.0997 6.53417C11.3464 6.04083 9.95305 4.6475 9.45971 2.89417C9.38638 2.6275 9.53971 2.35416 9.80638 2.27416C10.073 2.20083 10.3464 2.35416 10.4197 2.62083C10.8197 4.04083 11.9464 5.1675 13.3664 5.5675C13.633 5.64083 13.7864 5.92083 13.713 6.1875C13.653 6.41416 13.453 6.55417 13.233 6.55417Z"
          fill="#C60C0C"
        />
      </svg>
    );
  },
  downloadIcon(props: IconProps) {
    return (
      <svg
        {...props}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10.0002 15.1663H6.00016C2.38016 15.1663 0.833496 13.6197 0.833496 9.99967V5.99967C0.833496 2.37967 2.38016 0.833008 6.00016 0.833008H10.0002C13.6202 0.833008 15.1668 2.37967 15.1668 5.99967V9.99967C15.1668 13.6197 13.6202 15.1663 10.0002 15.1663ZM6.00016 1.83301C2.92683 1.83301 1.8335 2.92634 1.8335 5.99967V9.99967C1.8335 13.073 2.92683 14.1663 6.00016 14.1663H10.0002C13.0735 14.1663 14.1668 13.073 14.1668 9.99967V5.99967C14.1668 2.92634 13.0735 1.83301 10.0002 1.83301H6.00016Z"
          fill="#FAFBFB"
        />
        <path
          d="M7.9998 10.1731C7.87313 10.1731 7.74647 10.1265 7.64647 10.0265L5.64646 8.02647C5.45313 7.83314 5.45313 7.51314 5.64646 7.3198C5.8398 7.12647 6.1598 7.12647 6.35313 7.3198L7.9998 8.96647L9.64647 7.3198C9.8398 7.12647 10.1598 7.12647 10.3531 7.3198C10.5465 7.51314 10.5465 7.83314 10.3531 8.02647L8.35313 10.0265C8.25313 10.1265 8.12646 10.1731 7.9998 10.1731Z"
          fill="#FAFBFB"
        />
        <path
          d="M8 10.1732C7.72667 10.1732 7.5 9.94651 7.5 9.67318V4.33984C7.5 4.06651 7.72667 3.83984 8 3.83984C8.27333 3.83984 8.5 4.06651 8.5 4.33984V9.67318C8.5 9.95318 8.27333 10.1732 8 10.1732Z"
          fill="#FAFBFB"
        />
        <path
          d="M7.99996 12.1531C6.5933 12.1531 5.17996 11.9264 3.83996 11.4798C3.57996 11.3931 3.43996 11.1065 3.52663 10.8465C3.6133 10.5865 3.89329 10.4398 4.15996 10.5331C6.63996 11.3598 9.36663 11.3598 11.8466 10.5331C12.1066 10.4464 12.3933 10.5865 12.48 10.8465C12.5666 11.1065 12.4266 11.3931 12.1666 11.4798C10.82 11.9331 9.40663 12.1531 7.99996 12.1531Z"
          fill="#FAFBFB"
        />
      </svg>
    );
  },
  clippyIcon(props: IconProps) {
    return (
      <svg
        {...props}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5.75 4.75H10.25V1.75H5.75V4.75Z" />
        <path d="M3.25 2.88379C2.9511 3.05669 2.75 3.37987 2.75 3.75001V13.25C2.75 13.8023 3.19772 14.25 3.75 14.25H12.25C12.8023 14.25 13.25 13.8023 13.25 13.25V3.75001C13.25 3.37987 13.0489 3.05669 12.75 2.88379" />
      </svg>
    );
  },
  checkIcon(props: IconProps) {
    return (
      <svg
        {...props}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13.25 4.75L6 12L2.75 8.75" />
      </svg>
    );
  },
};
