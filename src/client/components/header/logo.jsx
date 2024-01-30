import logo from './website-logo.png';
const Logo = ({ ...rest }) => (
    <img width={110} src={logo} style={{ marginTop: '-12px' }} alt="website logo" />
);

export default Logo;
