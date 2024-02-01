import logo from './website-logo.png';
const Logo = ({ ...rest }) => (
    <img width={135} src={logo} style={{ marginTop: '-24px' }} alt="website logo" />
);

export default Logo;
